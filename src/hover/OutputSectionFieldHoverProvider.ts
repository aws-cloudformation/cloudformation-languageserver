import { outputSectionFieldDocsMap } from '../artifacts/OutputSectionFieldDocs';
import { Context } from '../context/Context';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class OutputSectionFieldHoverProvider implements HoverProvider {
    private static readonly OUTPUT_SECTION_FIELDS = new Set(['Description', 'Value', 'Export']);

    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const attributeName = context.text;

        if (!OutputSectionFieldHoverProvider.OUTPUT_SECTION_FIELDS.has(attributeName)) {
            return undefined;
        }

        return outputSectionFieldDocsMap.get(attributeName);
    }

    static isOutputSectionField(text: string): boolean {
        return OutputSectionFieldHoverProvider.OUTPUT_SECTION_FIELDS.has(text);
    }
}
