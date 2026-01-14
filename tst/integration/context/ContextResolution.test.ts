import { describe, afterAll, it } from 'vitest';
import { TopLevelSectionsWithLogicalIds } from '../../../src/context/CloudFormationEnums';
import { toString } from '../../../src/utils/String';
import { TemplateTestOrchestrator } from '../../utils/TemplateTestOrchestrator';
import { Templates } from '../../utils/TemplateUtils';
import { EXPECTED, verify } from './Expected';

describe('Context Resolution', () => {
    for (const templateType of Object.keys(EXPECTED)) {
        describe(`Template Type: ${templateType}`, () => {
            for (const language of ['json', 'yaml']) {
                describe(`Language: ${language}`, () => {
                    const template = Templates[templateType][language as 'json' | 'yaml'];
                    const expectedResults = EXPECTED[templateType][language as 'json' | 'yaml'];
                    const orchestrator = new TemplateTestOrchestrator(template);

                    afterAll(() => {
                        orchestrator.cleanup();
                    });

                    for (const section of Object.keys(expectedResults)) {
                        describe(`Section: ${section}`, () => {
                            for (const logicalId of Object.keys(expectedResults[section])) {
                                it(`LogicalId: ${logicalId}`, () => {
                                    verify(
                                        expectedResults[section][logicalId],
                                        orchestrator.testEntityContextResolution(section, logicalId),
                                    );
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    // eslint-disable-next-line vitest/no-disabled-tests
    describe.skip('Expected output generation', () => {
        for (const template of [Templates.comprehensive.yaml, Templates.sample.yaml, Templates.simple.yaml]) {
            const orchestrator = new TemplateTestOrchestrator(template);
            it(`${orchestrator.fileName}`, () => {
                const results: any = {};
                for (const section of Object.keys(orchestrator.template)) {
                    if (!TopLevelSectionsWithLogicalIds.includes(section)) {
                        continue;
                    }

                    const sectionData: any = {};
                    for (const logicalId of Object.keys(orchestrator.template[section])) {
                        sectionData[logicalId] = orchestrator.testEntityContextResolution(section, logicalId);
                    }
                    results[section] = sectionData;
                }
                // eslint-disable-next-line no-console
                console.log(toString(results));
            });
        }
    });
});
