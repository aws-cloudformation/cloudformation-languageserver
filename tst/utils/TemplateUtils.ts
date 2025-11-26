import { readFileSync } from 'fs';
import { join } from 'path';
import { Point } from 'tree-sitter';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { Position } from 'vscode-languageserver-textdocument/lib/esm/main';

const cache = new Map<string, string>();
const loadTemplate = (name: string) => {
    if (!cache.has(name)) {
        cache.set(name, readFileSync(join(__dirname, '..', 'resources', 'templates', name), 'utf8'));
    }
    return cache.get(name)!;
};

export const Templates: Record<string, Record<'json' | 'yaml', { fileName: string; contents: string }>> = {
    broken: {
        json: {
            fileName: 'file://broken.json',
            get contents() {
                return loadTemplate('broken.json');
            },
        },
        yaml: {
            fileName: 'file://broken.yaml',
            get contents() {
                return loadTemplate('broken.yaml');
            },
        },
    },
    simple: {
        json: {
            fileName: 'file://simple.json',
            get contents() {
                return loadTemplate('simple.json');
            },
        },
        yaml: {
            fileName: 'file://simple.yaml',
            get contents() {
                return loadTemplate('simple.yaml');
            },
        },
    },
    sample: {
        json: {
            fileName: 'file://sample_template.json',
            get contents() {
                return loadTemplate('sample_template.json');
            },
        },
        yaml: {
            fileName: 'file://sample_template.yaml',
            get contents() {
                return loadTemplate('sample_template.yaml');
            },
        },
    },
    sampleExpected: {
        json: {
            fileName: 'file://sample_template_after_edits.json',
            get contents() {
                return readFileSync(
                    join(__dirname, '..', 'resources', 'templates', 'sample_template_after_edits.json'),
                    'utf8',
                );
            },
        },
        yaml: {
            fileName: 'file://sample_template_after_edits.yaml',
            get contents() {
                return readFileSync(
                    join(__dirname, '..', 'resources', 'templates', 'sample_template_after_edits.yaml'),
                    'utf8',
                );
            },
        },
    },
    comprehensive: {
        json: {
            fileName: 'file://comprehensive.json',
            get contents() {
                return loadTemplate('comprehensive.json');
            },
        },
        yaml: {
            fileName: 'file://comprehensive.yaml',
            get contents() {
                return loadTemplate('comprehensive.yaml');
            },
        },
    },
    conditionUsage: {
        json: {
            fileName: 'file://condition-usage.json',
            get contents() {
                return loadTemplate('condition-usage.json');
            },
        },
        yaml: {
            fileName: 'file://condition-usage.yaml',
            get contents() {
                return loadTemplate('condition-usage.yaml');
            },
        },
    },
    parameterUsage: {
        json: {
            fileName: 'file://parameter_usage.json',
            get contents() {
                return loadTemplate('parameter_usage.json');
            },
        },
        yaml: {
            fileName: 'file://parameter_usage.yaml',
            get contents() {
                return loadTemplate('parameter_usage.yaml');
            },
        },
    },
    foreach: {
        json: {
            fileName: 'file://foreach_template.json',
            get contents() {
                return loadTemplate('foreach_template.json');
            },
        },
        yaml: {
            fileName: 'file://foreach_template.yaml',
            get contents() {
                return loadTemplate('foreach_template.yaml');
            },
        },
    },
    constants: {
        json: {
            fileName: 'file://constants.json',
            get contents() {
                return loadTemplate('constants.json');
            },
        },
        yaml: {
            fileName: 'file://constants.yaml',
            get contents() {
                return loadTemplate('constants.yaml');
            },
        },
    },
};

export function point(row: number, column: number): Point {
    return { row, column };
}

export function position(line: number, character: number): Position {
    return {
        line,
        character,
    };
}

export function docPosition(uri: string, line: number, character: number): TextDocumentPositionParams {
    return {
        textDocument: {
            uri,
        },
        position: position(line, character),
    };
}

export function getSimpleJsonTemplateText(): string {
    return Templates.simple.json.contents;
}

export function getSimpleYamlTemplateText(): string {
    return Templates.simple.yaml.contents;
}

export function getYamlTemplate(): string {
    return Templates.sample.yaml.contents;
}

export function getJsonTemplate(): string {
    return Templates.sample.json.contents;
}

export function getComprehensiveYamlTemplate(): string {
    return Templates.comprehensive.yaml.contents;
}

export function getComprehensiveJsonTemplate(): string {
    return Templates.comprehensive.json.contents;
}

export function getForEachYamlTemplate(): string {
    return Templates.foreach.yaml.contents;
}

export function getForEachJsonTemplate(): string {
    return Templates.foreach.json.contents;
}

export function getBrokenYamlTemplate(): string {
    return Templates.broken.yaml.contents;
}

export function getBrokenJsonTemplate(): string {
    return Templates.broken.json.contents;
}
