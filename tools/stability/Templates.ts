import { Templates } from '../../tst/utils/TemplateUtils';

export interface TemplateConfig {
    name: string;
    content: string;
}

export const TEMPLATE_CONFIGS: TemplateConfig[] = [
    {
        name: 'sample.yaml',
        content: Templates.sample.yaml.contents,
    },
    {
        name: 'simple.yaml',
        content: Templates.simple.yaml.contents,
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
