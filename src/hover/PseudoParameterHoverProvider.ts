import { pseudoParameterDocsMap } from '../artifacts/PseudoParameterDocs';
import { PseudoParameter } from '../context/CloudFormationEnums';
import { Context } from '../context/Context';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class PseudoParameterHoverProvider implements HoverProvider {
    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const pseudoParam = context.text as PseudoParameter;
        return pseudoParameterDocsMap.get(pseudoParam);
    }
}
