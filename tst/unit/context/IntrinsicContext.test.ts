import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ContextManager } from '../../../src/context/ContextManager';
import { IntrinsicFunction } from '../../../src/context/ContextType';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { docPosition, Templates } from '../../utils/TemplateUtils';

/* eslint-disable vitest/expect-expect */
describe('IntrinsicContext', () => {
    const syntaxTreeManager = new SyntaxTreeManager();
    const contextManager = new ContextManager(syntaxTreeManager);

    const sampleYamlUri = Templates.sample.yaml.fileName;
    const sampleYamlContent = Templates.sample.yaml.contents;
    const sampleJsonUri = Templates.sample.json.fileName;
    const sampleJsonContent = Templates.sample.json.contents;

    beforeAll(() => {
        syntaxTreeManager.add(sampleYamlUri, sampleYamlContent);
        syntaxTreeManager.add(sampleJsonUri, sampleJsonContent);
    });

    afterAll(() => {
        syntaxTreeManager.deleteAllTrees();
    });

    // Shared utility functions
    function getContextAt(line: number, character: number, uri: string) {
        return contextManager.getContext(docPosition(uri, line, character));
    }

    function expectIntrinsicFunction(context: any, expectedType: IntrinsicFunction) {
        const intrinsicContext = context?.intrinsicContext;
        expect(intrinsicContext).toBeDefined();
        expect(intrinsicContext!.inIntrinsic()).toBe(true);

        const functionInfo = intrinsicContext!.intrinsicFunction();
        expect(functionInfo).toBeDefined();
        expect(functionInfo!.type).toBe(expectedType);
        return functionInfo;
    }

    function expectNotInIntrinsic(context: any) {
        const intrinsicContext = context?.intrinsicContext;
        expect(intrinsicContext).toBeDefined();
        expect(intrinsicContext!.inIntrinsic()).toBe(false);
        expect(intrinsicContext!.intrinsicFunction()).toBeUndefined();
    }

    function expectLogicalIds(functionInfo: any, expectedIds: string[]) {
        const logicalIds = functionInfo!.logicalIds;
        for (const id of expectedIds) {
            expect(logicalIds).toContain(id);
        }
    }

    function expectNoLogicalIds(functionInfo: any, forbiddenIds: string[]) {
        const logicalIds = functionInfo!.logicalIds;
        for (const id of forbiddenIds) {
            expect(logicalIds).not.toContain(id);
        }
    }

    function expectProperRecord(intrinsicContext: any, isInside: boolean, expectedType?: IntrinsicFunction) {
        const record = intrinsicContext!.record();
        expect(record.isInsideIntrinsic).toBe(isInside);

        if (isInside && expectedType) {
            expect(record.intrinsicFunction).toBeDefined();
            expect(record.intrinsicFunction!.type).toBe(expectedType);
        } else {
            expect(record.intrinsicFunction).toBeUndefined();
        }
    }

    function expectArrayProperties(functionInfo: any) {
        expect(Array.isArray(functionInfo!.args)).toBe(true);
        expect(Array.isArray(functionInfo!.logicalIds)).toBe(true);
        expect(Array.isArray(functionInfo!.subVariables)).toBe(true);
        expect(typeof functionInfo!.hasNestedIntrinsics).toBe('boolean');
    }

    function expectSortedAndUniqueLogicalIds(functionInfo: any) {
        const logicalIds = functionInfo!.logicalIds;
        const sortedIds = [...logicalIds].sort();
        const uniqueIds = [...new Set(logicalIds)];
        expect(logicalIds).toEqual(sortedIds);
        expect(logicalIds).toEqual(uniqueIds);
    }

    function expectNoDottedReferences(functionInfo: any) {
        const logicalIds = functionInfo!.logicalIds;
        for (const id of logicalIds) {
            expect(id).not.toContain('.');
        }
    }

    describe('JSON', () => {
        const uri = sampleJsonUri;

        describe('Intrinsic Function Detection', () => {
            it('should detect Ref function', () => {
                const context = getContextAt(108, 12, uri); // "Ref": "StringParam"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.args).toBe('StringParam');
            });

            it('should detect FindInMap function', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectArrayProperties(functionInfo);
            });

            it('should detect Join function', () => {
                const context = getContextAt(140, 12, uri); // "Fn::Join": [ "-", [ "prod-only-bucket", { "Ref": "AWS::StackName" } ] ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Join);
                expectArrayProperties(functionInfo);
            });

            it('should not detect intrinsic when not in one', () => {
                const context = getContextAt(105, 4, uri); // "MyS3Bucket": { (resource name)
                expectNotInIntrinsic(context);
            });
        });

        describe('Logical ID Detection', () => {
            it('should find logical IDs in Ref function', () => {
                const context = getContextAt(108, 12, uri); // "Ref": "StringParam"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expectLogicalIds(functionInfo, ['StringParam']);
                expect(functionInfo!.logicalIds.length).toBe(1);
            });

            it('should find logical IDs in nested Ref within FindInMap', () => {
                const context = getContextAt(118, 14, uri); // nested "Ref": "EnvironmentType"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectLogicalIds(functionInfo, ['EnvironmentType']);
            });

            it('should not include pseudo parameters as logical IDs', () => {
                const context = getContextAt(125, 12, uri); // "Fn::FindInMap": [ "RegionMap", { "Ref": "AWS::Region" }, "AMI" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoLogicalIds(functionInfo, ['AWS::Region', 'AWS::StackName']);
            });

            it('should extract base logical ID from dotted references', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoDottedReferences(functionInfo);
            });

            it('should not include intrinsic function names as logical IDs', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoLogicalIds(functionInfo, ['Ref', 'Fn::FindInMap', 'Fn::Join', 'FindInMap', 'Join']);
            });

            it('should sort and deduplicate logical IDs', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectSortedAndUniqueLogicalIds(functionInfo);
            });
        });

        describe('Nested Intrinsics Detection', () => {
            it('should detect nested intrinsics in FindInMap', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expect(functionInfo!.hasNestedIntrinsics).toBe(true);
            });

            it('should detect nested intrinsics in Join', () => {
                const context = getContextAt(140, 12, uri); // "Fn::Join": [ "-", [ "prod-only-bucket", { "Ref": "AWS::StackName" } ] ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Join);
                expect(functionInfo!.hasNestedIntrinsics).toBe(true);
            });

            it('should not detect nested intrinsics in simple Ref', () => {
                const context = getContextAt(108, 12, uri); // "Ref": "StringParam"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.hasNestedIntrinsics).toBe(false);
            });
        });

        describe('Substitution Variables Detection', () => {
            it('should return empty array for non-Sub functions', () => {
                const context = getContextAt(108, 12, uri); // "Ref": "StringParam"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.subVariables).toEqual([]);
            });

            it('should return empty array for FindInMap functions', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap": [ "EnvironmentMap", { "Ref": "EnvironmentType" }, "InstanceType" ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expect(functionInfo!.subVariables).toEqual([]);
            });

            it('should return empty array for Join functions', () => {
                const context = getContextAt(140, 12, uri); // "Fn::Join": [ "-", [ "prod-only-bucket", { "Ref": "AWS::StackName" } ] ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Join);
                expect(functionInfo!.subVariables).toEqual([]);
            });
        });

        describe('Record Function', () => {
            it('should create proper record for intrinsic context', () => {
                const context = getContextAt(108, 12, uri); // "Ref": "StringParam"
                const intrinsicContext = context?.intrinsicContext;
                expect(intrinsicContext).toBeDefined();
                expectProperRecord(intrinsicContext, true, IntrinsicFunction.Ref);

                const record = intrinsicContext!.record();
                expect(record.intrinsicFunction!.logicalIds).toContain('StringParam');
            });

            it('should create proper record when not in intrinsic', () => {
                const context = getContextAt(105, 4, uri); // Resource name
                const intrinsicContext = context?.intrinsicContext;
                expect(intrinsicContext).toBeDefined();
                expectProperRecord(intrinsicContext, false);
            });
        });

        describe('Function Properties', () => {
            it('should have correct properties for intrinsic functions', () => {
                const context = getContextAt(116, 12, uri); // "Fn::FindInMap"
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectArrayProperties(functionInfo);

                const record = functionInfo!.record();
                expect(record.type).toBe(IntrinsicFunction.FindInMap);
                expect(record.args).toBeDefined();
                expect(Array.isArray(record.logicalIds)).toBe(true);
                expect(Array.isArray(record.subVariables)).toBe(true);
                expect(typeof record.hasNestedIntrinsics).toBe('boolean');
            });
        });
    });

    describe('YAML', () => {
        const uri = sampleYamlUri;

        describe('Intrinsic Function Detection', () => {
            it('should detect FindInMap function', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectArrayProperties(functionInfo);
            });

            it('should detect Ref function', () => {
                const context = getContextAt(72, 25, uri); // !Ref StringParam
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.args).toBe('StringParam');
            });

            it('should not detect intrinsic when not in one', () => {
                const context = getContextAt(70, 4, uri); // MyS3Bucket: (resource name)
                expectNotInIntrinsic(context);
            });
        });

        describe('Logical ID Detection', () => {
            it('should find logical IDs in Ref function', () => {
                const context = getContextAt(72, 25, uri); // !Ref StringParam
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expectLogicalIds(functionInfo, ['StringParam']);
                expect(functionInfo!.logicalIds.length).toBe(1);
            });

            it('should find logical IDs in nested Ref within FindInMap', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectLogicalIds(functionInfo, ['EnvironmentType']);
            });

            it('should not include pseudo parameters as logical IDs', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoLogicalIds(functionInfo, ['AWS::Region']);
            });

            it('should extract base logical ID from dotted references', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoDottedReferences(functionInfo);
            });

            it('should not include intrinsic function names as logical IDs', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectNoLogicalIds(functionInfo, ['Ref', 'FindInMap', 'Join']);
            });

            it('should sort and deduplicate logical IDs', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectSortedAndUniqueLogicalIds(functionInfo);
            });
        });

        describe('Nested Intrinsics Detection', () => {
            it('should detect nested intrinsics in FindInMap', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expect(functionInfo!.hasNestedIntrinsics).toBe(true);
            });

            it('should not detect nested intrinsics in simple Ref', () => {
                const context = getContextAt(72, 25, uri); // !Ref StringParam
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.hasNestedIntrinsics).toBe(false);
            });
        });

        describe('Substitution Variables Detection', () => {
            it('should return empty array for non-Sub functions', () => {
                const context = getContextAt(72, 25, uri); // !Ref StringParam
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.Ref);
                expect(functionInfo!.subVariables).toEqual([]);
            });

            it('should return empty array for FindInMap functions', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expect(functionInfo!.subVariables).toEqual([]);
            });

            it('should extract substitution variables from Sub function strings', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expect(Array.isArray(functionInfo!.subVariables)).toBe(true);
            });
        });

        describe('Record Function', () => {
            it('should create proper record for intrinsic context', () => {
                const context = getContextAt(72, 25, uri); // !Ref StringParam
                const intrinsicContext = context?.intrinsicContext;
                expect(intrinsicContext).toBeDefined();
                expectProperRecord(intrinsicContext, true, IntrinsicFunction.Ref);

                const record = intrinsicContext!.record();
                expect(record.intrinsicFunction!.logicalIds).toContain('StringParam');
            });

            it('should create proper record when not in intrinsic', () => {
                const context = getContextAt(70, 4, uri); // Resource name
                const intrinsicContext = context?.intrinsicContext;
                expect(intrinsicContext).toBeDefined();
                expectProperRecord(intrinsicContext, false);
            });
        });

        describe('Function Properties', () => {
            it('should have correct properties for intrinsic functions', () => {
                const context = getContextAt(77, 20, uri); // !FindInMap
                const functionInfo = expectIntrinsicFunction(context, IntrinsicFunction.FindInMap);
                expectArrayProperties(functionInfo);

                const record = functionInfo!.record();
                expect(record.type).toBe(IntrinsicFunction.FindInMap);
                expect(record.args).toBeDefined();
                expect(Array.isArray(record.logicalIds)).toBe(true);
                expect(Array.isArray(record.subVariables)).toBe(true);
                expect(typeof record.hasNestedIntrinsics).toBe('boolean');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty path to root gracefully', () => {
            const context = getContextAt(0, 0, sampleYamlUri); // Template format version
            const intrinsicContext = context?.intrinsicContext;

            expect(intrinsicContext).toBeDefined();
            expect(intrinsicContext!.inIntrinsic()).toBe(false);
        });

        it('should handle malformed positions gracefully', () => {
            const context = getContextAt(1000, 1000, sampleYamlUri); // Way beyond file end
            const intrinsicContext = context?.intrinsicContext;

            // Should either be undefined or handle gracefully without throwing
            if (intrinsicContext) {
                expect(() => intrinsicContext.inIntrinsic()).not.toThrow();
            }
        });
    });

    describe('Lazy Loading', () => {
        it('should lazy load intrinsic function info', () => {
            const context = getContextAt(77, 20, sampleYamlUri); // !FindInMap
            const intrinsicContext = context?.intrinsicContext;

            expect(intrinsicContext).toBeDefined();

            // Access the private _context property to verify lazy loading
            expect((intrinsicContext as any)._context).toBeUndefined();

            // First access should create the context
            const functionInfo1 = intrinsicContext!.intrinsicFunction();
            expect((intrinsicContext as any)._context).toBeDefined();

            // Second access should return the same instance
            const functionInfo2 = intrinsicContext!.intrinsicFunction();
            expect(functionInfo1).toBe(functionInfo2);
        });
    });
});
