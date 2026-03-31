import { readFileSync } from 'fs';
import { join } from 'path';

const cache = new Map<string, string>();

const loadTemplate = (name: string): string => {
    if (!cache.has(name)) {
        const templatePath = join(__dirname, '../../tst/resources/templates', name);
        cache.set(name, readFileSync(templatePath, 'utf8'));
    }
    return cache.get(name)!;
};

export interface StandaloneTemplateConfig {
    name: string;
    content: string;
}

export const STANDALONE_TEMPLATE_CONFIGS: StandaloneTemplateConfig[] = [
    {
        name: 'sample.yaml',
        content: loadTemplate('sample_template.yaml'),
    },
    {
        name: 'simple.yaml',
        content: loadTemplate('simple.yaml'),
    },
    {
        name: 'comprehensive.yaml',
        content: loadTemplate('comprehensive.yaml'),
    },
    {
        name: 'condition-usage.yaml',
        content: loadTemplate('condition-usage.yaml'),
    },
];
