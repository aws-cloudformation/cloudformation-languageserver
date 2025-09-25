import { ResourceAttribute } from '../context/ContextType';

export const resourceAttributeDocsMap = getResourceAttributeDocsMap();

function getResourceAttributeDocsMap(): Map<ResourceAttribute, string> {
    const resourceAttributeDocsMap = new Map<ResourceAttribute, string>();

    resourceAttributeDocsMap.set(
        ResourceAttribute.CreationPolicy,
        [
            '**CreationPolicy**',
            '\n',
            '---',
            'Prevents resource status from reaching create complete until CloudFormation receives signals or timeout.',
            'Configuration object with AutoScalingCreationPolicy and ResourceSignal properties.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.DeletionPolicy,
        [
            '**DeletionPolicy**',
            '\n',
            '---',
            'Specifies what happens to the resource when the stack is deleted.',
            'Available options: Delete (default), Retain, Snapshot',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.UpdatePolicy,
        [
            '**UpdatePolicy**',
            '\n',
            '---',
            'Specifies how CloudFormation handles updates to the resource.',
            'Configuration object with AutoScalingRollingUpdate, AutoScalingReplacingUpdate, and other update policies.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.UpdateReplacePolicy,
        [
            '**UpdateReplacePolicy**',
            '\n',
            '---',
            'Specifies what happens to the resource when a replacement is required during update.',
            'Available options: Delete, Retain, Snapshot',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.Condition,
        [
            '**Condition**',
            '\n',
            '---',
            'Associates the resource with a condition defined in the Conditions section.',
            'Value must be a reference to a condition name defined in the template.',
            'Resource will be conditionally created based on the value being true.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html#environment-based-resource-creation)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.DependsOn,
        [
            '**DependsOn**',
            '\n',
            '---',
            'Specifies explicit dependencies between resources.',
            'Value can be a string (single dependency) or array of strings (multiple dependencies) containing resource logical IDs.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html)',
        ].join('\n'),
    );

    resourceAttributeDocsMap.set(
        ResourceAttribute.Metadata,
        [
            '**Metadata**',
            '\n',
            '---',
            'Associates arbitrary metadata with the resource.',
            'Value is a JSON/YAML object with custom key-value pairs for additional resource information.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-metadata.html)',
        ].join('\n'),
    );

    return resourceAttributeDocsMap;
}
