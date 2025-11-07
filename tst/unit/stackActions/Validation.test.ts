import { DateTime } from 'luxon';
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

    describe('ValidationDetails management', () => {
        it('should get and set validation details', () => {
            const validationDetails = [
                {
                    ValidationName: 'test',
                    LogicalId: 'TestResource',
                    ResourcePropertyPath: '/Resources/TestResource',
                    Timestamp: DateTime.now(),
                    Severity: 'ERROR' as const,
                    Message: 'Test error',
                    diagnosticId: 'test-id-1',
                },
            ];

            validation.setValidationDetails(validationDetails);
            expect(validation.getValidationDetails()).toEqual(validationDetails);
        });

        it('should remove validation detail by diagnosticId', () => {
            const validationDetails = [
                {
                    ValidationName: 'test1',
                    LogicalId: 'TestResource1',
                    ResourcePropertyPath: '/Resources/TestResource1',
                    Timestamp: DateTime.now(),
                    Severity: 'ERROR' as const,
                    Message: 'Test error 1',
                    diagnosticId: 'test-id-1',
                },
                {
                    ValidationName: 'test2',
                    LogicalId: 'TestResource2',
                    ResourcePropertyPath: '/Resources/TestResource2',
                    Timestamp: DateTime.now(),
                    Severity: 'ERROR' as const,
                    Message: 'Test error 2',
                    diagnosticId: 'test-id-2',
                },
            ];

            validation.setValidationDetails(validationDetails);
            validation.removeValidationDetailByDiagnosticId('test-id-1');

            const remaining = validation.getValidationDetails();
            expect(remaining).toHaveLength(1);
            expect(remaining?.[0].diagnosticId).toBe('test-id-2');
        });

        it('should handle removing non-existent diagnosticId', () => {
            const validationDetails = [
                {
                    ValidationName: 'test',
                    LogicalId: 'TestResource',
                    ResourcePropertyPath: '/Resources/TestResource',
                    Timestamp: DateTime.now(),
                    Severity: 'ERROR' as const,
                    Message: 'Test error',
                    diagnosticId: 'test-id-1',
                },
            ];

            validation.setValidationDetails(validationDetails);
            validation.removeValidationDetailByDiagnosticId('non-existent-id');

            expect(validation.getValidationDetails()).toHaveLength(1);
        });

        it('should handle removing from empty validation details', () => {
            validation.removeValidationDetailByDiagnosticId('test-id');
            expect(validation.getValidationDetails()).toBeUndefined();
        });
    });
});
