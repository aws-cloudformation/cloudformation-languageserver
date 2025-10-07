import { describe, it, expect } from 'vitest';
import { creationPolicyPropertyDocsMap } from '../../../src/artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import {
    ResourceAttribute,
    CreationPolicyProperty,
    ResourceSignalProperty,
    AutoScalingCreationPolicyProperty,
} from '../../../src/context/ContextType';
import { CreationPolicyPropertyHoverProvider } from '../../../src/hover/CreationPolicyPropertyHoverProvider';
import { createResourceContext } from '../../utils/MockContext';

describe('CreationPolicyPropertyHoverProvider', () => {
    const creationPolicyPropertyHoverProvider = new CreationPolicyPropertyHoverProvider();

    describe('CreationPolicy Property Hover', () => {
        it('should return ResourceSignal.Count documentation when hovering on Count property', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'Count',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'CreationPolicy', 'ResourceSignal', 'Count'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        ResourceSignal: {
                            Count: 1,
                        },
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
                ),
            );
        });

        it('should return ResourceSignal.Timeout documentation when hovering on Timeout property', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'Timeout',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'CreationPolicy', 'ResourceSignal', 'Timeout'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        ResourceSignal: {
                            Timeout: 'PT5M',
                        },
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Timeout}`,
                ),
            );
        });

        it('should return AutoScalingCreationPolicy.MinSuccessfulInstancesPercent documentation when hovering on MinSuccessfulInstancesPercent property', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'MinSuccessfulInstancesPercent',
                propertyPath: [
                    'Resources',
                    'MyAutoScalingGroup',
                    'CreationPolicy',
                    'AutoScalingCreationPolicy',
                    'MinSuccessfulInstancesPercent',
                ],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        AutoScalingCreationPolicy: {
                            MinSuccessfulInstancesPercent: 100,
                        },
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.AutoScalingCreationPolicy}.${AutoScalingCreationPolicyProperty.MinSuccessfulInstancesPercent}`,
                ),
            );
        });

        it('should return StartFleet documentation when hovering on StartFleet property', () => {
            const mockContext = createResourceContext('MyAppStreamFleet', {
                text: 'StartFleet',
                propertyPath: ['Resources', 'MyAppStreamFleet', 'CreationPolicy', 'StartFleet'],
                data: {
                    Type: 'AWS::AppStream::Fleet',
                    CreationPolicy: {
                        StartFleet: true,
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.StartFleet}`,
                ),
            );
        });

        it('should return undefined for invalid CreationPolicy property', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'InvalidProperty',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'CreationPolicy', 'InvalidProperty'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        InvalidProperty: 'value',
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-CreationPolicy context', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'Properties',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'Properties'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    Properties: {
                        MinSize: 1,
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined for empty text', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: '',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'CreationPolicy'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {},
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when context is not a resource attribute property', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'Count',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'Properties', 'MinSize'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    Properties: {
                        MinSize: 1,
                    },
                },
            });

            mockContext.isResourceAttributeProperty = () => false;

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return documentation for EC2 Instance with ResourceSignal', () => {
            const mockContext = createResourceContext('MyEC2Instance', {
                text: 'Count',
                propertyPath: ['Resources', 'MyEC2Instance', 'CreationPolicy', 'ResourceSignal', 'Count'],
                data: {
                    Type: 'AWS::EC2::Instance',
                    CreationPolicy: {
                        ResourceSignal: {
                            Count: 1,
                        },
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
                ),
            );
        });

        it('should return documentation for WaitCondition with ResourceSignal', () => {
            const mockContext = createResourceContext('MyWaitCondition', {
                text: 'Timeout',
                propertyPath: ['Resources', 'MyWaitCondition', 'CreationPolicy', 'ResourceSignal', 'Timeout'],
                data: {
                    Type: 'AWS::CloudFormation::WaitCondition',
                    CreationPolicy: {
                        ResourceSignal: {
                            Timeout: 'PT10M',
                        },
                    },
                },
            });

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Timeout}`,
                ),
            );
        });

        it('should handle nested property path with multiple levels', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'MinSuccessfulInstancesPercent',
                propertyPath: [
                    'Resources',
                    'MyAutoScalingGroup',
                    'CreationPolicy',
                    'AutoScalingCreationPolicy',
                    'MinSuccessfulInstancesPercent',
                ],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        AutoScalingCreationPolicy: {
                            MinSuccessfulInstancesPercent: 80,
                        },
                    },
                },
            });

            // Mock the resource attribute property path method
            mockContext.getResourceAttributePropertyPath = () => [
                'CreationPolicy',
                'AutoScalingCreationPolicy',
                'MinSuccessfulInstancesPercent',
            ];

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.AutoScalingCreationPolicy}.${AutoScalingCreationPolicyProperty.MinSuccessfulInstancesPercent}`,
                ),
            );
        });
    });

    describe('Context validation', () => {
        it('should only process contexts that are resource attribute properties', () => {
            const mockContext = createResourceContext('MyResource', {
                text: 'Count',
                propertyPath: ['Resources', 'MyResource', 'Properties', 'SomeProperty'],
                data: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        SomeProperty: 'value',
                    },
                },
            });

            mockContext.isResourceAttributeProperty = () => false;

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBeUndefined();
        });

        it('should process contexts that are resource attribute properties', () => {
            const mockContext = createResourceContext('MyAutoScalingGroup', {
                text: 'Count',
                propertyPath: ['Resources', 'MyAutoScalingGroup', 'CreationPolicy', 'ResourceSignal', 'Count'],
                data: {
                    Type: 'AWS::AutoScaling::AutoScalingGroup',
                    CreationPolicy: {
                        ResourceSignal: {
                            Count: 1,
                        },
                    },
                },
            });

            mockContext.isResourceAttributeProperty = () => true;
            mockContext.getResourceAttributePropertyPath = () => ['CreationPolicy', 'ResourceSignal', 'Count'];

            const result = creationPolicyPropertyHoverProvider.getInformation(mockContext);

            expect(result).toBe(
                creationPolicyPropertyDocsMap.get(
                    `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
                ),
            );
        });
    });
});
