export const outputSectionFieldDocsMap = getOutputSectionFieldDocsMap();

function getOutputSectionFieldDocsMap(): Map<string, string> {
    const outputSectionFieldDocsMap = new Map<string, string>();

    outputSectionFieldDocsMap.set(
        'Description',
        [
            '**Description (optional)**',
            '\n',
            '---',
            'A `String` type that describes the output value.  ',
            "The value for the description declaration must be a literal string that's between 0 and 1024 bytes in length. ",
            "You can't use a parameter or function to specify the description. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html)',
        ].join('\n'),
    );

    outputSectionFieldDocsMap.set(
        'Value',
        [
            '**Value (required)**',
            '\n',
            '---',
            'The value of the property returned by the [describe-stacks](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/service_code_examples.html#describe-stacks-sdk) command. ',
            'The value of an output can include literals, parameter references, pseudo parameters, a mapping value, or intrinsic functions. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html)',
        ].join('\n'),
    );

    outputSectionFieldDocsMap.set(
        'Export',
        [
            '**Export (optional)**',
            '\n',
            '---',
            'The name of the resource output to be exported for a cross-stack reference.',
            '\n',
            'You can use intrinsic functions to customize the Name value of an export. ',
            '\n',
            'For more information, see [Get exported outputs from a deployed CloudFormation stack](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html). ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html)',
        ].join('\n'),
    );

    return outputSectionFieldDocsMap;
}
