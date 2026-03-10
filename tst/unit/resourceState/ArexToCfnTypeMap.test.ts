/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
    arexTypeToCfnType,
    cfnTypeToArexType,
    getSearchableResourceTypes,
    extractIdentifierFromArn,
    parseArnToIdentifierMap,
} from '../../../src/resourceState/ArexToCfnTypeMap';

describe('ArexToCfnTypeMap', () => {
    describe('arexTypeToCfnType', () => {
        it('should convert AREX type to CFN type', () => {
            expect(arexTypeToCfnType('ec2:instance')).toBe('AWS::EC2::Instance');
            expect(arexTypeToCfnType('s3:bucket')).toBe('AWS::S3::Bucket');
            expect(arexTypeToCfnType('lambda:function')).toBe('AWS::Lambda::Function');
        });

        it('should return undefined for unknown AREX type', () => {
            expect(arexTypeToCfnType('unknown:type')).toBeUndefined();
            expect(arexTypeToCfnType('')).toBeUndefined();
        });
    });

    describe('cfnTypeToArexType', () => {
        it('should convert CFN type to AREX type', () => {
            expect(cfnTypeToArexType('AWS::EC2::Instance')).toBe('ec2:instance');
            expect(cfnTypeToArexType('AWS::S3::Bucket')).toBe('s3:bucket');
            expect(cfnTypeToArexType('AWS::Lambda::Function')).toBe('lambda:function');
        });

        it('should return undefined for unknown CFN type', () => {
            expect(cfnTypeToArexType('AWS::Unknown::Type')).toBeUndefined();
            expect(cfnTypeToArexType('')).toBeUndefined();
        });
    });

    describe('getSearchableResourceTypes', () => {
        it('should return an array of CFN types', () => {
            const types = getSearchableResourceTypes();
            expect(Array.isArray(types)).toBe(true);
            expect(types.length).toBeGreaterThan(0);
        });

        it('should contain common CFN types', () => {
            const types = getSearchableResourceTypes();
            expect(types).toContain('AWS::EC2::Instance');
            expect(types).toContain('AWS::S3::Bucket');
            expect(types).toContain('AWS::Lambda::Function');
        });

        it('should only contain CFN type format strings', () => {
            const types = getSearchableResourceTypes();
            for (const type of types) {
                expect(type).toMatch(/^AWS::[A-Za-z0-9]+::[A-Za-z0-9]+$/);
            }
        });
    });

    describe('extractIdentifierFromArn', () => {
        it('should extract identifier from S3 bucket ARN', () => {
            const arn = 'arn:aws:s3:::my-bucket-name';
            const result = extractIdentifierFromArn('AWS::S3::Bucket', arn);
            expect(result).toBe('my-bucket-name');
        });

        it('should extract identifier from Lambda function ARN', () => {
            const arn = 'arn:aws:lambda:us-east-1:123456789012:function:my-function';
            const result = extractIdentifierFromArn('AWS::Lambda::Function', arn);
            expect(result).toBe('my-function');
        });

        it('should return full ARN for unknown CFN type', () => {
            const arn = 'arn:aws:unknown:us-east-1:123456789012:resource/id';
            const result = extractIdentifierFromArn('AWS::Unknown::Type', arn);
            expect(result).toBe(arn);
        });

        it('should return full ARN when regex does not match', () => {
            const arn = 'invalid-arn-format';
            const result = extractIdentifierFromArn('AWS::S3::Bucket', arn);
            expect(result).toBe(arn);
        });
    });
});

describe('parseArnToIdentifierMap', () => {
    it('should return exact matches for primary identifiers', () => {
        const arn = 'arn:aws:lambda:us-east-1:123456789012:function:my-function';
        const result = parseArnToIdentifierMap(arn, 'AWS::Lambda::Function', ['FunctionName']);
        expect(result).toEqual({ FunctionName: 'my-function' });
    });

    it('should handle ARN-as-identifier (fields ending with arn)', () => {
        const arn = 'arn:aws:sqs:us-east-1:123456789012:my-queue';
        const result = parseArnToIdentifierMap(arn, 'AWS::SQS::Queue', ['QueueArn']);
        expect(result?.QueueArn).toBe(arn);
    });

    it('should handle Account/AccountId mapping', () => {
        // Test that Account from ARN maps to primary identifier
        const arn = 'arn:aws:appflow:us-east-1:123456789012:flow/my-flow';
        const result = parseArnToIdentifierMap(arn, 'AWS::AppFlow::Flow', ['FlowName']);
        expect(result?.FlowName).toBe('my-flow');
    });

    it('should handle 1-to-1 fallback when single remaining component and primary id', () => {
        const arn = 'arn:aws:s3:::my-bucket-name';
        const result = parseArnToIdentifierMap(arn, 'AWS::S3::Bucket', ['BucketName']);
        expect(result).toEqual({ BucketName: 'my-bucket-name' });
    });

    it('should return undefined for unknown CFN type', () => {
        const arn = 'arn:aws:unknown:us-east-1:123456789012:resource/id';
        const result = parseArnToIdentifierMap(arn, 'AWS::Unknown::Type', ['Id']);
        expect(result).toBeUndefined();
    });

    it('should return undefined when ARN does not match pattern', () => {
        const arn = 'invalid-arn-format';
        const result = parseArnToIdentifierMap(arn, 'AWS::S3::Bucket', ['BucketName']);
        expect(result).toBeUndefined();
    });

    it('should handle compound identifiers', () => {
        const arn = 'arn:aws:amplify:us-east-1:123456789012:apps/d1234567/branches/main';
        const result = parseArnToIdentifierMap(arn, 'AWS::Amplify::Branch', ['AppId', 'BranchName']);
        expect(result?.AppId).toBe('d1234567');
        expect(result?.BranchName).toBe('main');
    });

    it('should return identifiers in correct order for API Gateway Deployment', () => {
        const arn = 'arn:aws:apigateway:us-east-1::/restapis/5hm2qt0sr3/deployments/9eqr1w';
        const result = parseArnToIdentifierMap(arn, 'AWS::ApiGateway::Deployment', ['DeploymentId', 'RestApiId']);
        expect(result?.DeploymentId).toBe('9eqr1w');
        expect(result?.RestApiId).toBe('5hm2qt0sr3');

        // Verify order when building identifier string
        const primaryIdProps = ['DeploymentId', 'RestApiId'];
        const identifierString = primaryIdProps.map((p) => result?.[p]).join('|');
        expect(identifierString).toBe('9eqr1w|5hm2qt0sr3');
    });
});
