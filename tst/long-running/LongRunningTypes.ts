import { getYamlTemplate, getSimpleYamlTemplateText, Templates } from '../utils/TemplateUtils';

export type TesterConfig = {
    maxRetries: number;
    responseTimeout: number;
};

export type TemplateConfig = {
    name: string;
    content: string;
};

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
    {
        name: 'sample.yaml',
        content: getYamlTemplate(),
    },
    {
        name: 'simple.yaml',
        content: getSimpleYamlTemplateText(),
    },
    {
        name: 'comprehensive.yaml',
        content: Templates.comprehensive.yaml.contents,
    },
    {
        name: 'condition-usage.yaml',
        content: Templates.conditionUsage.yaml.contents,
    },
];
