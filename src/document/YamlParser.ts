/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/ban-ts-comment */
import { load, DEFAULT_SCHEMA, Type, YAMLException } from 'js-yaml';

const MaxParseAttempts = 5;

export function parseYaml(yamlString: string, parseAttempt: number = 0, jsonParseCompatible: boolean = true): any {
    if (parseAttempt >= MaxParseAttempts) {
        return undefined;
    }

    try {
        return load(yamlString, {
            schema: CloudFormationSchema,
            json: jsonParseCompatible,
        });
    } catch (error) {
        if (error instanceof YAMLException) {
            // Check if the error is about a missing colon, and fix it
            if (
                // @ts-ignore
                typeof error?.mark?.line === 'number' &&
                // @ts-ignore
                `${error?.reason}`.includes('a colon is missed')
            ) {
                const lines = yamlString.split('\n');
                // @ts-ignore
                const problemLine = error.mark.line;
                // Remove the line that's causing the issue
                lines.splice(problemLine, 1);

                // Try parsing again with the fixed YAML
                return parseYaml(lines.join('\n'), parseAttempt + 1, jsonParseCompatible);
            }
        } else {
            throw error;
        }
    }
}

const CloudFormationYamlTypes = [
    // !Ref
    new Type('!Ref', {
        kind: 'scalar',
        construct: (data: any) => ({ '!Ref': data }),
    }),

    // !GetAtt - both scalar and sequence forms
    new Type('!GetAtt', {
        kind: 'scalar',
        construct: (data: any) => ({ '!GetAtt': data }),
    }),
    new Type('!GetAtt', {
        kind: 'sequence',
        construct: (data: any) => ({ '!GetAtt': data }),
    }),

    // !Sub - scalar, sequence, and mapping forms
    new Type('!Sub', {
        kind: 'scalar',
        construct: (data: any) => ({ '!Sub': data }),
    }),
    new Type('!Sub', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Sub': data }),
    }),
    new Type('!Sub', {
        kind: 'mapping',
        construct: (data: any) => ({ '!Sub': data }),
    }),

    // !Join
    new Type('!Join', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Join': data }),
    }),

    // !Select
    new Type('!Select', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Select': data }),
    }),

    // !Split
    new Type('!Split', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Split': data }),
    }),

    // !Base64 - both scalar and mapping forms, including nested functions
    new Type('!Base64', {
        kind: 'scalar',
        construct: (data: any) => ({ '!Base64': data }),
    }),
    new Type('!Base64', {
        kind: 'mapping',
        construct: (data: any) => ({ '!Base64': data }),
    }),
    new Type('!Base64', {
        kind: 'sequence',
        construct: (data: any[]) => ({ '!Base64': data }),
    }),

    // !GetAZs - both scalar and empty forms
    new Type('!GetAZs', {
        kind: 'scalar',
        construct: (data: any) => ({ '!GetAZs': data }),
    }),
    new Type('!GetAZs', {
        kind: 'mapping',
        construct: (data: any) => ({ '!GetAZs': data }),
    }),

    // !FindInMap
    new Type('!FindInMap', {
        kind: 'sequence',
        construct: (data: any) => ({ '!FindInMap': data }),
    }),

    // !If
    new Type('!If', {
        kind: 'sequence',
        construct: (data: any) => ({ '!If': data }),
    }),

    // !Equals
    new Type('!Equals', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Equals': data }),
    }),

    // !Not
    new Type('!Not', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Not': data }),
    }),

    // !And
    new Type('!And', {
        kind: 'sequence',
        construct: (data: any[]) => ({ '!And': data }),
    }),

    // !Or
    new Type('!Or', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Or': data }),
    }),

    // !Condition
    new Type('!Condition', {
        kind: 'scalar',
        construct: (data: any) => ({ '!Condition': data }),
    }),

    // Additional CloudFormation functions
    // !Contains
    new Type('!Contains', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Contains': data }),
    }),

    // !Implies
    new Type('!Implies', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Implies': data }),
    }),

    // !ImportValue
    new Type('!ImportValue', {
        kind: 'scalar',
        construct: (data: any) => ({ '!ImportValue': data }),
    }),
    new Type('!ImportValue', {
        kind: 'mapping',
        construct: (data: any) => ({ '!ImportValue': data }),
    }),

    // !Length
    new Type('!Length', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Length': data }),
    }),

    // !Cidr
    new Type('!Cidr', {
        kind: 'sequence',
        construct: (data: any) => ({ '!Cidr': data }),
    }),

    // !Transform
    new Type('!Transform', {
        kind: 'mapping',
        construct: (data: any) => ({ '!Transform': data }),
    }),

    // !ToJsonString
    new Type('!ToJsonString', {
        kind: 'mapping',
        construct: (data: any) => ({ '!ToJsonString': data }),
    }),
    new Type('!ToJsonString', {
        kind: 'sequence',
        construct: (data: any) => ({ '!ToJsonString': data }),
    }),

    // !ForEach
    new Type('!ForEach', {
        kind: 'sequence',
        construct: (data: any) => ({ '!ForEach': data }),
    }),
];

const CloudFormationSchema = DEFAULT_SCHEMA.extend(CloudFormationYamlTypes);
