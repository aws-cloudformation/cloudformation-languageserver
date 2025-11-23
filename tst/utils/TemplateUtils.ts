import { readFileSync } from 'fs';
import { join } from 'path';
import { Point } from 'tree-sitter';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { Position } from 'vscode-languageserver-textdocument/lib/esm/main';

export const Templates: Record<string, Record<'json' | 'yaml', { fileName: string; contents: string }>> = {
    broken: {
        json: {
            fileName: 'file://broken.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'broken.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://broken.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'broken.yaml'), 'utf8');
            },
        },
    },
    simple: {
        json: {
            fileName: 'file://simple.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'simple.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://simple.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'simple.yaml'), 'utf8');
            },
        },
    },
    sample: {
        json: {
            fileName: 'file://sample_template.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'sample_template.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://sample_template.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'sample_template.yaml'), 'utf8');
            },
        },
    },
    comprehensive: {
        json: {
            fileName: 'file://comprehensive.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'comprehensive.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://comprehensive.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'comprehensive.yaml'), 'utf8');
            },
        },
    },
    conditionUsage: {
        json: {
            fileName: 'file://condition-usage.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'condition-usage.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://condition-usage.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'condition-usage.yaml'), 'utf8');
            },
        },
    },
    parameterUsage: {
        json: {
            fileName: 'file://parameter_usage.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'parameter_usage.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://parameter_usage.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'parameter_usage.yaml'), 'utf8');
            },
        },
    },
    foreach: {
        json: {
            fileName: 'file://foreach_template.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'foreach_template.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://foreach_template.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'foreach_template.yaml'), 'utf8');
            },
        },
    },
    constants: {
        json: {
            fileName: 'file://constants.json',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'constants.json'), 'utf8');
            },
        },
        yaml: {
            fileName: 'file://constants.yaml',
            get contents() {
                return readFileSync(join(__dirname, '..', 'resources', 'templates', 'constants.yaml'), 'utf8');
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
