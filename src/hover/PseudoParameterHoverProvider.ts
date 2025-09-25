import { pseudoParameterDocsMap } from '../artifacts/PseudoParameterDocs';
import { Context } from '../context/Context';
import { PseudoParameter } from '../context/ContextType';
import { HoverProvider } from './HoverProvider';

export class PseudoParameterHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        const pseudoParam = context.text as PseudoParameter;
        return pseudoParameterDocsMap.get(pseudoParam);
    }
}
