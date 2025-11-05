import { intrinsicFunctionsDocsMap } from '../artifacts/IntrinsicFunctionsDocs';
import { Context } from '../context/Context';
import { IntrinsicFunction } from '../context/ContextType';
import { normalizeIntrinsicFunction } from '../context/semantic/Intrinsics';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class IntrinsicFunctionHoverProvider implements HoverProvider {
    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const normalizedFunction = normalizeIntrinsicFunction(context.text);
        return intrinsicFunctionsDocsMap.get(normalizedFunction as IntrinsicFunction);
    }
}
