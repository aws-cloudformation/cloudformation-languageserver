import { Context } from '../context/Context';
import { Parameter } from '../context/semantic/Entity';
import { Measure } from '../telemetry/TelemetryDecorator';
import { formatParameterHover } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class ParameterHoverProvider implements HoverProvider {
    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const parameter = context.entity as Parameter;
        if (!parameter) {
            return undefined;
        }

        return formatParameterHover(parameter);
    }
}
