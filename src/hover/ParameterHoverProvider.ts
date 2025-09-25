import { Context } from '../context/Context';
import { Parameter } from '../context/semantic/Entity';
import { formatParameterHover } from './HoverFormatter';
import { HoverProvider } from './HoverProvider';

export class ParameterHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        const parameter = context.entity as Parameter;
        if (!parameter) {
            return undefined;
        }

        return formatParameterHover(parameter);
    }
}
