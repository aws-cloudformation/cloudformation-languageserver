import { Context } from '../context/Context';
import { Constant } from '../context/semantic/Entity';
import { Measure } from '../telemetry/TelemetryDecorator';
import { formatConstantHover } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class ConstantHoverProvider implements HoverProvider {
    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        const constant = context.entity as Constant;
        if (!constant?.name) {
            return undefined;
        }

        return formatConstantHover(constant);
    }
}
