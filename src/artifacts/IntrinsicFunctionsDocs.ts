import { IntrinsicFunction } from '../context/ContextType';

export const intrinsicFunctionsDocsMap = getIntrinsicFunctionsDocsMap();

function getIntrinsicFunctionsDocsMap(): Map<IntrinsicFunction, string> {
    const intrinsicFunctionsDocsMap = new Map<IntrinsicFunction, string>();
    intrinsicFunctionsDocsMap.set(
        //Intrinsic Functions
        IntrinsicFunction.Base64,
        [
            '**Fn::Base64**',
            '\n',
            '---',
            'The intrinsic function `Fn::Base64` returns the Base64 representation of the input string.',
            'This function is typically used to pass encoded data to Amazon EC2 instances through the UserData property.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-base64.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Cidr,
        [
            '**Fn::Cidr**',
            '\n',
            '---',
            'The intrinsic function `Fn::Cidr` returns an array of CIDR address blocks.',
            'The number of CIDR blocks returned is dependent on the count parameter.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-cidr.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.FindInMap,
        [
            '**Fn::FindInMap**',
            '\n',
            '---',
            'The intrinsic function `Fn::FindInMap` returns the value corresponding to keys in a two-level map that is declared in the Mappings section.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-findinmap.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.GetAtt,
        [
            '**Fn::GetAtt**',
            '\n',
            '---',
            'The `Fn::GetAtt` intrinsic function returns the value of an attribute from a resource in the template.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getatt.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.GetAZs,
        [
            '**Fn::GetAZs**',
            '\n',
            '---',
            'The intrinsic function `Fn::GetAZs` returns an array that lists Availability Zones for a specified Region in alphabetical order. ',
            "Because customers have access to different Availability Zones, the intrinsic function `Fn::GetAZs` enables template authors to write templates that adapt to the calling user's access. ",
            "That way you don't have to hard-code a full list of Availability Zones for a specified Region. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getavailabilityzones.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.ImportValue,
        [
            '**Fn::ImportValue**',
            '\n',
            '---',
            'The intrinsic function `Fn::ImportValue` returns the value of an output exported by another stack. ',
            'You typically use this function to create cross-stack references. ',
            'For more information, see [Walkthrough: Refer to resource outputs in another CloudFormation stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-crossstackref.html) in the *AWS CloudFormation User Guide*. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Join,
        [
            '**Fn::Join**',
            '\n',
            '---',
            'The intrinsic function `Fn::Join` appends a set of values into a single value, separated by the specified delimiter. ',
            'If a delimiter is the empty string, the set of values are concatenated with no delimiter. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-join.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Select,
        [
            '**Fn::Select**',
            '\n',
            '---',
            'The intrinsic function `Fn::Select` returns a single object from a list of objects by index.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-select.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Split,
        [
            '**Fn::Split**',
            '\n',
            '---',
            'To split a string into a list of string values so that you can select an element from the resulting string list, use the `Fn::Split` intrinsic function.',
            'Specify the location of splits with a delimiter, such as `,` (a comma). ',
            'After you split a string, use the [Fn::Select](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-select.html) function to pick a specific element. ',
            '\n',
            'For example, if a comma-delimited string of subnet IDs is imported to your stack template, you can split the string at each comma. ',
            'From the list of subnet IDs, use the `Fn::Select` intrinsic function to specify a subnet ID for a resource. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-split.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Sub,
        [
            '**Fn::Sub**',
            '\n',
            '---',
            'The intrinsic function `Fn::Sub` substitutes variables in an input string with values that you specify. ',
            "In your templates, you can use this function to construct commands or outputs that include values that aren't available until you create or update a stack. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-sub.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Transform,
        [
            '**Fn::Transform**',
            '\n',
            '---',
            'The intrinsic function `Fn::Transform` specifies a macro to perform custom processing on part of a stack template. ',
            'Macros enable you to perform custom processing on templates, from simple actions like find-and-replace operations to extensive transformations of entire templates. ',
            'For more information, see [Using CloudFormation macros to perform custom processing on templates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-macros.html) in the *AWS CloudFormation User Guide*. ',
            '\n',
            'You can also use `Fn::Transform` to call the [AWS::Include](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-include.html) transform transform, which is a macro hosted by AWS CloudFormation. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-transform.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Ref,
        [
            '**Ref**',
            '\n',
            '---',
            'The intrinsic function `Ref` returns the value of a specified parameter, resource, or another intrinsic function. ',
            'This function is commonly used to create references between resources within a CloudFormation template. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ref.html)',
        ].join('\n'),
    );
    //Condition and Rule Functions
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.And,
        [
            '**Fn::And**',
            '\n',
            '---',
            'Returns `true` if all the specified conditions evaluate to true, or returns `false` if any one of the conditions evaluates to false. ',
            '`Fn::And` acts as an AND operator. ',
            'The minimum number of conditions that you can include is 2, and the maximum is 10. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-and)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.ForEach,
        [
            '**Fn::ForEach**',
            '\n',
            '---',
            'The `Fn::ForEach` intrinsic function takes a collection and a fragment, and applies the items in the collection to the identifier in the provided fragment. ',
            '`Fn::ForEach` can contain other intrinsic functions, including `Fn::ForEach` itself, and be used within the `Conditions`, `Outputs`, and `Resources` (including the resource properties) sections. ',
            "It can't be used in any of the following sections, `AWSTemplateFormatVersion`, `Description`, `Metadata`, `Transform`, `Parameters`, `Mappings`, `Rules`, or `Hooks` sections. ",
            '\n',
            'If you use the `Fn::ForEach` intrinsic function in your template, you must also use the [AWS::LanguageExtensions transform](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-languageextensions.html). ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-foreach.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Length,
        [
            '**Fn::Length**',
            '\n',
            '---',
            'The intrinsic function `Fn::Length` returns the number of elements within an array or an intrinsic function that returns an array. ',
            'You must use the [AWS::LanguageExtensions transform](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-languageextensions.html) transform to use the `Fn::Length` intrinsic function. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-length.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.ToJsonString,
        [
            '**Fn::ToJsonString**',
            '\n',
            '---',
            'The `Fn::ToJsonString` intrinsic function converts an object or array to its corresponding JSON string. ',
            'You must use the [AWS::LanguageExtensions transform](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/transform-aws-languageextensions.html) transform to use the `Fn::ToJsonString` intrinsic function. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-ToJsonString.html)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Equals,
        [
            '**Fn::Equals**',
            '\n',
            '---',
            'Compares if two values are equal. ',
            "Returns `true` if the two values are equal or `false`` if they aren't. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-equals)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.If,
        [
            '**Fn::If**',
            '\n',
            '---',
            'Returns one value if the specified condition evaluates to `true` and another value if the specified condition evaluates to `false`. ',
            'Currently, CloudFormation supports the `Fn::If` intrinsic function in the metadata attribute, update policy attribute, and property values in the `Resources` section and `Outputs` sections of a template. ',
            'You can use the `AWS::NoValue` pseudo parameter as a return value to remove the corresponding property. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-if)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Not,
        [
            '**Fn::Not**',
            '\n',
            '---',
            'Returns `true` for a condition that evaluates to `false` or returns `false` for a condition that evaluates to true. ',
            '`Fn::Not` acts as a NOT operator. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-not)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Or,
        [
            '**Fn::Or**',
            '\n',
            '---',
            'Returns `true` if any one of the specified conditions evaluate to true, or returns `false` if all the conditions evaluates to false. ',
            '`Fn::Or` acts as an OR operator. ',
            'The minimum number of conditions that you can include is 2, and the maximum is 10. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html#intrinsic-function-reference-conditions-or)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.Contains,
        [
            '**Fn::Contains**',
            '\n',
            '---',
            'Returns `true` if a specified string matches at least one value in a list of strings. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-contains)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.EachMemberEquals,
        [
            '**Fn::EachMemberEquals**',
            '\n',
            '---',
            'Returns `true` if a specified string matches all values in a list. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-eachmemberequals)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.EachMemberIn,
        [
            '**Fn::EachMemberIn**',
            '\n',
            '---',
            'Returns `true` if each member in a list of strings matches at least one value in a second list of strings. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-eachmemberin)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.RefAll,
        [
            '**Fn::RefAll**',
            '\n',
            '---',
            'Returns all values for a specified parameter type. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-refall)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.ValueOf,
        [
            '**Fn::ValueOf**',
            '\n',
            '---',
            'Returns an attribute value or list of values for a specific parameter and attribute. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-valueof)',
        ].join('\n'),
    );
    intrinsicFunctionsDocsMap.set(
        IntrinsicFunction.ValueOfAll,
        [
            '**Fn::ValueOfAll**',
            '\n',
            '---',
            'Returns a list of all attribute values for a given parameter type and attribute. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-rules.html#fn-valueofall)',
        ].join('\n'),
    );
    return intrinsicFunctionsDocsMap;
}
