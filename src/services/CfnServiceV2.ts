/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { DynamicModuleLoader } from '../utils/DynamicModuleLoader';
import { CfnService } from './CfnService';

export type DescribeEventsOutput = {
    OperationEvents: {
        EventType: string;
        Timestamp: string | Date;
        LogicalResourceId?: string;
        ValidationPath?: string;
        ValidationFailureMode?: string;
        ValidationName?: string;
        ValidationStatusReason?: string;
        Details?: string;
    }[];
    NextToken?: string;
};

export class CfnServiceV2 extends CfnService {
    public async describeEvents(params: { ChangeSetName: string; StackName: string }): Promise<DescribeEventsOutput> {
        const cfnPath = join(homedir(), 'client-cloudformation-v2');

        if (!existsSync(cfnPath)) {
            throw new Error('DescribeEventsCommand not available - client-cloudformation-v2 not found');
        }

        type CfnClient = typeof import('@aws-sdk/client-cloudformation') & {
            DescribeEventsCommand: new (input: { ChangeSetName: string; StackName: string; NextToken?: string }) => any;
        };

        const cfn = DynamicModuleLoader.load<CfnClient>(cfnPath);

        if (!cfn?.DescribeEventsCommand) {
            throw new Error('DescribeEventsCommand not available in loaded module');
        }

        const { DescribeEventsCommand } = cfn;

        return await this.withClient(async (client) => {
            let nextToken: string | undefined;
            let result: DescribeEventsOutput | undefined;
            const operationEvents: DescribeEventsOutput['OperationEvents'] = [];

            do {
                const response = (await client.send(
                    new DescribeEventsCommand({
                        ...params,
                        NextToken: nextToken,
                    }),
                )) as unknown as DescribeEventsOutput;

                if (result) {
                    operationEvents.push(...(response.OperationEvents ?? []));
                } else {
                    result = response;
                    operationEvents.push(...(result.OperationEvents ?? []));
                }

                nextToken = response.NextToken;
            } while (nextToken);

            result.OperationEvents = operationEvents;
            result.NextToken = undefined;
            return result;
        });
    }
}
