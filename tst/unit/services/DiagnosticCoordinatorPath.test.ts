import { stubInterface } from 'ts-sinon';
import { afterEach, describe, expect, it } from 'vitest';
import { Range } from 'vscode-languageserver';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { LspDiagnostics } from '../../../src/protocol/LspDiagnostics';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import { ValidationManager } from '../../../src/stacks/actions/ValidationManager';
import { positionOfText } from '../../utils/TemplateUtils';

describe('DiagnosticCoordinator template path resolution', () => {
    const syntaxTreeManagers: SyntaxTreeManager[] = [];

    afterEach(() => {
        for (const manager of syntaxTreeManagers) {
            manager.deleteAllTrees();
        }
        syntaxTreeManagers.length = 0;
    });

    function createCoordinator(uri: string, content: string): DiagnosticCoordinator {
        const syntaxTreeManager = new SyntaxTreeManager();
        syntaxTreeManager.add(uri, content);
        syntaxTreeManagers.push(syntaxTreeManager);
        return new DiagnosticCoordinator(
            stubInterface<LspDiagnostics>(),
            syntaxTreeManager,
            stubInterface<ValidationManager>(),
        );
    }

    function rangeOfKey(content: string, keyText: string): Range {
        const start = positionOfText(content, keyText);
        return {
            start,
            end: { line: start.line, character: start.character + keyText.length },
        };
    }

    it.each([
        {
            format: 'YAML',
            uri: 'file:///numeric-map.yaml',
            content: `Mappings:
  AccountMap:
    '123456789012':
      Enabled: false
`,
            keyText: 'Enabled',
        },
        {
            format: 'JSON',
            uri: 'file:///numeric-map.json',
            content: `{
  "Mappings": {
    "AccountMap": {
      "123456789012": {
        "Enabled": false
      }
    }
  }
}`,
            keyText: '"Enabled"',
        },
    ])('resolves a numeric map key in $format', ({ uri, content, keyText }) => {
        const coordinator = createCoordinator(uri, content);

        const range = coordinator.getKeyRangeFromPath(uri, '/Mappings/AccountMap/123456789012/Enabled');

        expect(range).toEqual(rangeOfKey(content, keyText));
    });

    it.each([
        {
            format: 'YAML',
            uri: 'file:///array-path.yaml',
            content: `Resources:
  Role:
    Properties:
      Policies:
        - PolicyName: First
`,
            keyText: 'PolicyName',
        },
        {
            format: 'JSON',
            uri: 'file:///array-path.json',
            content: `{
  "Resources": {
    "Role": {
      "Properties": {
        "Policies": [
          { "PolicyName": "First" }
        ]
      }
    }
  }
}`,
            keyText: '"PolicyName"',
        },
    ])('resolves a string-encoded array index in $format', ({ uri, content, keyText }) => {
        const coordinator = createCoordinator(uri, content);

        const range = coordinator.getKeyRangeFromPath(uri, '/Resources/Role/Properties/Policies/0/PolicyName');

        expect(range).toEqual(rangeOfKey(content, keyText));
    });
});
