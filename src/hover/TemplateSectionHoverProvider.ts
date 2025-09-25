import { templateSectionDocsMap } from '../artifacts/TemplateSectionDocs';
import { Context } from '../context/Context';
import { TopLevelSection } from '../context/ContextType';
import { HoverProvider } from './HoverProvider';

export class TemplateSectionHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        return templateSectionDocsMap.get(context.text as TopLevelSection);
    }
}
