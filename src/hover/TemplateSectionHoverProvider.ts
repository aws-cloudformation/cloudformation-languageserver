import { templateSectionDocsMap } from '../artifacts/TemplateSectionDocs';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { Context } from '../context/Context';
import { FeatureFlag } from '../featureFlag/FeatureFlagI';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class TemplateSectionHoverProvider implements HoverProvider {
    constructor(private readonly constantsFeatureFlag: FeatureFlag) {}

    @Measure({ name: 'getInformation' })
    getInformation(context: Context): string | undefined {
        if (context.text === String(TopLevelSection.Constants) && !this.constantsFeatureFlag.isEnabled()) {
            return undefined;
        }

        return templateSectionDocsMap.get(context.text as TopLevelSection);
    }
}
