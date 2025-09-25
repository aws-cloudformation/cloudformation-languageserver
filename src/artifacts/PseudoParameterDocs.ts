import { PseudoParameter } from '../context/ContextType';

export const pseudoParameterDocsMap = getPseudoParameterDocsMap();

function getPseudoParameterDocsMap(): Map<PseudoParameter, string> {
    const pseudoParameterDocsMap = new Map<PseudoParameter, string>();

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSAccountId,
        [
            '**AWS::AccountId**',
            '\n',
            '---',
            'Returns the AWS account ID of the account in which the stack is being created, such as `123456789012`. ',
            'This pseudo parameter is commonly used when defining IAM roles, policies, and other resource policies that involve account-specific ARNs. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSRegion,
        [
            '**AWS::Region**',
            '\n',
            '---',
            'Returns a string representing the Region in which the encompassing resource is being created, such as `us-west-2`. ',
            'This is one of the most commonly used pseudo parameters, as it allows templates to adapt to different AWS Regions without modification.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSStackId,
        [
            '**AWS::StackId**',
            '\n',
            '---',
            'Returns the ID (ARN) of the stack, such as `arn:aws:cloudformation:us-west-2:123456789012:stack/teststack/51af3dc0-da77-11e4-872e-1234567db123`. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSStackName,
        [
            '**AWS::StackName**',
            '\n',
            '---',
            'Returns the name of the stack, such as `teststack`. ',
            'The stack name is commonly used to create unique resource names that are easily identifiable as belonging to a specific stack.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSNotificationARNs,
        [
            '**AWS::NotificationARNs**',
            '\n',
            '---',
            'Returns the list of Amazon Resource Names (ARNs) for the Amazon SNS topics that receive stack event notifications. ',
            'You can specify these ARNs through the `--notification-arns` option in the AWS CLI or through the console as you are creating or updating your stack. ',
            'Unlike other pseudo parameters that return a single value, `AWS::NotificationARNs` returns a list of ARNs. ',
            'To access a specific ARN in the list, use the `Fn::Select` intrinsic function. For more information, see [Fn::Select](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-select.html). ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSNoValue,
        [
            '**AWS::NoValue**',
            '\n',
            '---',
            'Removes the corresponding resource property when specified as a return value in the `Fn::If` intrinsic function. ',
            'For more information, see [Fn::If](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if). ',
            'This pseudo parameter is particularly useful for creating conditional resource properties that should only be included under certain conditions.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSPartition,
        [
            '**AWS::Partition**',
            '\n',
            '---',
            'Returns the partition that the resource is in. ',
            'For standard AWS Regions, the partition is `aws`. ',
            'For resources in other partitions, the partition is `aws-partitionname`. ',
            'For example, the partition for resources in the China (Beijing and Ningxia) Regions is `aws-cn` and the partition for resources in the AWS GovCloud (US-West) Region is `aws-us-gov`. ',
            'The partition forms part of the ARN for resources. Using `AWS::Partition` ensures your templates work correctly across different AWS partitions.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    pseudoParameterDocsMap.set(
        PseudoParameter.AWSURLSuffix,
        [
            '**AWS::URLSuffix**',
            '\n',
            '---',
            'Returns the suffix for the AWS domain in the AWS Region where the stack is deployed.',
            'The suffix is typically `amazonaws.com`, but for the China (Beijing) Region, the suffix is `amazonaws.com.cn`.',
            'This parameter is particularly useful when constructing URLs for AWS service endpoints.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/pseudo-parameter-reference.html)',
        ].join('\n'),
    );

    return pseudoParameterDocsMap;
}
