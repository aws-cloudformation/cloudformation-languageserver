import { describe, it, expect, beforeEach } from 'vitest';
import { StackActionPhase } from '../../../src/stacks/actions/StackActionRequestType';
import { Validation } from '../../../src/stacks/actions/Validation';

describe('Validation', () => {
    let validation: Validation;

    beforeEach(() => {
        validation = new Validation('test.yaml', 'test-stack', 'test-changeset');
    });

    it('should create validation with required parameters', () => {
        expect(validation.getUri()).toBe('test.yaml');
        expect(validation.getStackName()).toBe('test-stack');
        expect(validation.getChangeSetName()).toBe('test-changeset');
    });

    it('should create validation with optional parameters', () => {
        const parameters = [{ ParameterKey: 'key', ParameterValue: 'value' }];
        const capabilities = ['CAPABILITY_IAM'];

        const validationWithParams = new Validation(
            'test.yaml',
            'test-stack',
            'test-changeset',
            parameters,
            capabilities as any,
        );

        expect(validationWithParams.getParameters()).toBe(parameters);
        expect(validationWithParams.getCapabilities()).toBe(capabilities);
    });

    it('should set and get phase', () => {
        validation.setPhase(StackActionPhase.VALIDATION_IN_PROGRESS);
        expect(validation.getPhase()).toBe(StackActionPhase.VALIDATION_IN_PROGRESS);
    });

    it('should set and get changes', () => {
        const changes = [
            {
                type: 'Resource',
                resourceChange: {
                    action: 'Add',
                    logicalResourceId: 'TestBucket',
                },
            },
        ];

        validation.setChanges(changes);
        expect(validation.getChanges()).toBe(changes);
    });

    it('should get changeSetName', () => {
        expect(validation.getChangeSetName()).toBe('test-changeset');
    });

    it('should set and get capabilities', () => {
        const capabilities = ['CAPABILITY_IAM'];
        validation.setCapabilities(capabilities as any);
        expect(validation.getCapabilities()).toBe(capabilities);
    });

    it('should handle undefined capabilities', () => {
        expect(validation.getCapabilities()).toBeUndefined();
    });

    it('should handle undefined phase', () => {
        expect(validation.getPhase()).toBeUndefined();
    });

    it('should handle undefined changes', () => {
        expect(validation.getChanges()).toBeUndefined();
    });

    describe('Consistent getter/setter methods', () => {
        it('should access all properties through getter methods', () => {
            const parameters = [{ ParameterKey: 'key', ParameterValue: 'value' }];
            const capabilities = ['CAPABILITY_IAM'];

            const validationWithParams = new Validation(
                'test.yaml',
                'test-stack',
                'test-changeset',
                parameters,
                capabilities as any,
            );

            // Test all getter methods
            expect(validationWithParams.getUri()).toBe('test.yaml');
            expect(validationWithParams.getStackName()).toBe('test-stack');
            expect(validationWithParams.getChangeSetName()).toBe('test-changeset');
            expect(validationWithParams.getParameters()).toBe(parameters);
            expect(validationWithParams.getCapabilities()).toBe(capabilities);
        });

        it('should set and get phase through consistent methods', () => {
            validation.setPhase(StackActionPhase.VALIDATION_IN_PROGRESS);
            expect(validation.getPhase()).toBe(StackActionPhase.VALIDATION_IN_PROGRESS);
        });

        it('should set and get changes through consistent methods', () => {
            const changes = [
                {
                    type: 'Resource',
                    resourceChange: {
                        action: 'Add',
                        logicalResourceId: 'TestBucket',
                    },
                },
            ];

            validation.setChanges(changes);
            expect(validation.getChanges()).toBe(changes);
        });

        it('should set and get capabilities through consistent methods', () => {
            const capabilities = ['CAPABILITY_IAM'];
            validation.setCapabilities(capabilities as any);
            expect(validation.getCapabilities()).toBe(capabilities);
        });

        it('should handle undefined values consistently', () => {
            expect(validation.getPhase()).toBeUndefined();
            expect(validation.getChanges()).toBeUndefined();
            expect(validation.getCapabilities()).toBeUndefined();
        });
    });
});
