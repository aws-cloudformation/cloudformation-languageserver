export const parameterAttributeDocsMap: ReadonlyMap<string, string> = getParameterAttributeDocsMap();

function getParameterAttributeDocsMap(): Map<string, string> {
    const parameterAttributeDocsMap = new Map<string, string>();

    parameterAttributeDocsMap.set(
        'Type',
        [
            '**Type**',
            '\n',
            '---',
            'The data type for the parameter (`DataType`). ',
            '\n',
            '*Required*: Yes ',
            '\n',
            'CloudFormation supports the following parameter types: ',
            '\n',
            '**String**',
            '\n',
            'A literal string. You can use the following attributes to declare constraints: `MinLength`, `MaxLength`, `Default`, `AllowedValues`, and `AllowedPattern`.',
            '\n',
            'For example, users could specify `"MyUserName"`.',
            '\n',
            '**Number**',
            '\n',
            'An integer or float. CloudFormation validates the parameter value as a number; however, when you use the parameter elsewhere in your template (for example, by using the `Ref` intrinsic function), the parameter value becomes a string.',
            '\n',
            'You can use the following attributes to declare constraints: `MinValue`, `MaxValue`, `Default`, and `AllowedValues`.',
            '\n',
            'For example, users could specify `"8888"`.',
            '\n',
            '**List<Number>**',
            '\n',
            'An array of integers or floats that are separated by commas. CloudFormation validates the parameter value as numbers; however, when you use the parameter elsewhere in your template (for example, by using the `Ref` intrinsic function), the parameter value becomes a list of strings.',
            '\n',
            'For example, users could specify `"80,20"`, and a Ref would result in `["80","20"]`.',
            '\n',
            '**CommaDelimitedList**',
            '\n',
            'An array of literal strings that are separated by commas. The total number of strings should be one more than the total number of commas. Also, each member string is space trimmed.',
            '\n',
            'For example, users could specify `"test,dev,prod"`, and a Ref would result in `["test","dev","prod"]`.',
            '\n',
            '**AWS-specific parameter types**',
            '\n',
            'AWS values such as Amazon EC2 key pair names and VPC IDs. For more information, see [Specify existing resources at runtime](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html).',
            '\n',
            '**Systems Manager parameter types**',
            '\n',
            'Parameters that correspond to existing parameters in Systems Manager Parameter Store. You specify a Systems Manager parameter key as the value of the Systems Manager parameter type, and CloudFormation retrieves the latest value from Parameter Store to use for the stack. For more information, see [Specify existing resources at runtime](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html).',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'Default',
        [
            '**Default**',
            '\n',
            '---',
            'A value of the appropriate type for the template to use if no value is specified when a stack is created. ',
            'If you define constraints for the parameter, you must specify a value that adheres to those constraints. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'Description',
        [
            '**Description**',
            '\n',
            '---',
            'A string of up to 4000 characters that describes the parameter. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'AllowedValues',
        [
            '**AllowedValues**',
            '\n',
            '---',
            'An array containing the list of values allowed for the parameter. ',
            'When applied to a parameter of type `String`, the parameter value must be one of the allowed values. ',
            'When applied to a parameter of type `CommaDelimitedList`, each value in the list must be one of the specified allowed values. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'AllowedPattern',
        [
            '**AllowedPattern**',
            '\n',
            '---',
            'A regular expression that represents the patterns to allow for `String` or `CommaDelimitedList` types. ',
            'When applied on a parameter of type `String`, the pattern must match the entire parameter value provided. ',
            'When applied to a parameter of type `CommaDelimitedList`, the pattern must match each value in the list. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'MinLength',
        [
            '**MinLength**',
            '\n',
            '---',
            'An integer value that determines the smallest number of characters you want to allow for `String` types. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'MaxLength',
        [
            '**MaxLength**',
            '\n',
            '---',
            'An integer value that determines the largest number of characters you want to allow for `String` types. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'MinValue',
        [
            '**MinValue**',
            '\n',
            '---',
            'A numeric value that determines the smallest numeric value you want to allow for `Number` types. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'MaxValue',
        [
            '**MaxValue**',
            '\n',
            '---',
            'A numeric value that determines the largest numeric value you want to allow for `Number` types. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'NoEcho',
        [
            '**NoEcho**',
            '\n',
            '---',
            'Whether to mask the parameter value to prevent it from being displayed in the console, command line tools, or API. ',
            'If you set the NoEcho attribute to true, CloudFormation returns the parameter value masked as asterisks (*****) for any calls that describe the stack or stack events, except for information stored in the locations specified below. ',
            '\n',
            '- The `Metadata` template section. CloudFormation does not transform, modify, or redact any information you include in the `Metadata` section. For more information, see [Metadata](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/metadata-section-structure.html).',
            '- The `Outputs` template section. For more information, see [Outputs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html).',
            '- The Metadata attribute of a resource definition. For more information, see [Metadata attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-metadata.html).',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    parameterAttributeDocsMap.set(
        'ConstraintDescription',
        [
            '**ConstraintDescription**',
            '\n',
            '---',
            'A string that explains a constraint when the constraint is violated. ',
            'For example, without a constraint description, a parameter that has an allowed pattern of [A-Za-z0-9]+ displays the following error message when the user specifies an invalid value: ',
            '\n',
            'Malformed input-Parameter `MyParameter` must match pattern `[A-Za-z0-9]+` ',
            '\n',
            'By adding a constraint description, such as *must only contain letters (uppercase and lowercase) and numbers*, you can display the following customized error message: ',
            '\n',
            'Malformed input-Parameter `MyParameter` must only contain uppercase and lowercase letters and numbers ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html)',
        ].join('\n'),
    );

    return parameterAttributeDocsMap;
}
