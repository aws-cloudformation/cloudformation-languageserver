import { describe, expect, test, afterAll } from 'vitest';
import { TopLevelSection, TopLevelSections } from '../../../src/context/ContextType';
import { contextEntitiesInSections, getEntityMap } from '../../../src/context/SectionContextBuilder';
import { createJsonTree, createYamlTree } from '../../utils/TestTree';
import { getJsonTemplate, getYamlTemplate } from '../../utils/Utils';

describe('SectionContextBuilder', () => {
    const yamlTree = createYamlTree(getYamlTemplate());
    const jsonTree = createJsonTree(getJsonTemplate());
    const logicalIds = new Set([
        'StringParam', // Parameter
        'EnvironmentType', // Parameter
        'InstanceType', // Parameter

        'RegionMap', // Mapping

        'IsProd', // Conditions
        'IsDev', // Conditions
        'CreateProdResources', // Conditions

        'MyS3Bucket', // Resources
        'MyEC2Instance', // Resources

        'BucketName', // Outputs
    ]);

    afterAll(() => {
        yamlTree.cleanup();
        jsonTree.cleanup();
    });

    test.each([yamlTree, jsonTree])('finds section contexts based on provided logicalIds', (tree) => {
        const contexts = contextEntitiesInSections(
            tree.findTopLevelSections([...TopLevelSections] as TopLevelSection[]),
            tree,
            logicalIds,
        );

        expect(contexts.size).toBe(5);
        expect(contexts.get(TopLevelSection.Parameters)?.size).toBe(3);
        expect(contexts.get(TopLevelSection.Mappings)?.size).toBe(1);
        expect(contexts.get(TopLevelSection.Conditions)?.size).toBe(3);
        expect(contexts.get(TopLevelSection.Resources)?.size).toBe(2);
        expect(contexts.get(TopLevelSection.Outputs)?.size).toBe(1);

        expect([...contexts.get(TopLevelSection.Parameters)!.keys()]).toStrictEqual([
            'StringParam',
            'EnvironmentType',
            'InstanceType',
        ]);
        expect([...contexts.get(TopLevelSection.Mappings)!.keys()]).toStrictEqual(['RegionMap']);
        expect([...contexts.get(TopLevelSection.Conditions)!.keys()]).toStrictEqual([
            'IsProd',
            'IsDev',
            'CreateProdResources',
        ]);
        expect([...contexts.get(TopLevelSection.Resources)!.keys()]).toStrictEqual(['MyS3Bucket', 'MyEC2Instance']);
        expect([...contexts.get(TopLevelSection.Outputs)!.keys()]).toStrictEqual(['BucketName']);
    });

    test.each([yamlTree, jsonTree])('getEntityMap returns correct entity map for existing section', (tree) => {
        const parametersMap = getEntityMap(tree, TopLevelSection.Parameters);
        expect(parametersMap?.size).toBe(4);
        expect([...parametersMap!.keys()]).toStrictEqual([
            'StringParam',
            'NumberParam',
            'EnvironmentType',
            'InstanceType',
        ]);

        const conditionsMap = getEntityMap(tree, TopLevelSection.Conditions);
        expect(conditionsMap?.size).toBe(4);
        expect([...conditionsMap!.keys()]).toStrictEqual(['IsProd', 'IsTest', 'IsDev', 'CreateProdResources']);
    });

    test('getEntityMap returns undefined for non-existing section', () => {
        const minimalTemplate = '{"AWSTemplateFormatVersion": "2010-09-09"}';
        const minimalTree = createJsonTree(minimalTemplate);

        const transformMap = getEntityMap(minimalTree, TopLevelSection.Transform);
        expect(transformMap).toBeUndefined();

        minimalTree.cleanup();
    });
});
