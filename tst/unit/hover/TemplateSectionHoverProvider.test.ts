import { describe, it, expect, beforeEach } from 'vitest';
import { templateSectionDocsMap } from '../../../src/artifacts/TemplateSectionDocs';
import { TopLevelSection } from '../../../src/context/ContextType';
import { TemplateSectionHoverProvider } from '../../../src/hover/TemplateSectionHoverProvider';
import { createTopLevelContext as topLevelContext } from '../../utils/MockContext';

describe('TemplateSectionHoverProvider', () => {
    let hoverProvider: TemplateSectionHoverProvider;
    const mockFeatureFlagEnabled = { isEnabled: () => true, describe: () => 'Constants feature flag' };
    const mockFeatureFlagDisabled = { isEnabled: () => false, describe: () => 'Constants feature flag' };

    beforeEach(() => {
        hoverProvider = new TemplateSectionHoverProvider(mockFeatureFlagEnabled);
    });

    function createTopLevelContext(section: string) {
        return topLevelContext(section, { text: section });
    }

    it('should return documentation for Resources section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Resources);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Resources));
    });

    it('should return documentation for Parameters section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Parameters);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Parameters));
    });

    it('should return documentation for Outputs section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Outputs);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Outputs));
    });

    it('should return documentation for Mappings section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Mappings);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Mappings));
    });

    it('should return documentation for Metadata section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Metadata);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Metadata));
    });

    it('should return documentation for Rules section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Rules);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Rules));
    });

    it('should return documentation for Conditions section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Conditions);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Conditions));
    });

    it('should return documentation for Transform section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Transform);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Transform));
    });

    it('should return documentation for AWSTemplateFormatVersion section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.AWSTemplateFormatVersion);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.AWSTemplateFormatVersion));
    });

    it('should return documentation for Description section', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Description);

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Description));
    });

    it('should return documentation for Constants section when feature flag is enabled', () => {
        const provider = new TemplateSectionHoverProvider(mockFeatureFlagEnabled);
        const mockContext = createTopLevelContext(TopLevelSection.Constants);

        const result = provider.getInformation(mockContext);

        expect(result).toBe(templateSectionDocsMap.get(TopLevelSection.Constants));
        expect(result).toBeDefined();
        expect(result).toContain('Constants');
    });

    it('should return undefined for Constants section when feature flag is disabled', () => {
        const provider = new TemplateSectionHoverProvider(mockFeatureFlagDisabled);
        const mockContext = createTopLevelContext(TopLevelSection.Constants);

        const result = provider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });

    it('should return undefined for Unknown section', () => {
        const mockContext = createTopLevelContext('SomeUnknownSection');
        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });

    it('should return undefined for empty text', () => {
        const mockContext = createTopLevelContext('');
        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });
});
