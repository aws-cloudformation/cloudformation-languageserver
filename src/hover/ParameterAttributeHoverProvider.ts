import { parameterAttributeDocsMap } from '../artifacts/ParameterAttributeDocs';
import { Context } from '../context/Context';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class ParameterAttributeHoverProvider implements HoverProvider {
    private static readonly PARAMETER_ATTRIBUTES = new Set([
        'AllowedPattern',
        'AllowedValues',
        'ConstraintDescription',
        'Default',
        'Description',
        'MaxLength',
        'MaxValue',
        'MinLength',
        'MinValue',
        'NoEcho',
        'Type',
    ]);

    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const attributeName = context.text;

        if (!ParameterAttributeHoverProvider.PARAMETER_ATTRIBUTES.has(attributeName)) {
            return undefined;
        }

        return parameterAttributeDocsMap.get(attributeName);
    }

    static isParameterAttribute(text: string): boolean {
        return ParameterAttributeHoverProvider.PARAMETER_ATTRIBUTES.has(text);
    }
}
