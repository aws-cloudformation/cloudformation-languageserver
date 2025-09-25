import { describe, it, expect, beforeEach } from 'vitest';
import { Validation } from '../../../src/templates/Validation';
import { ValidationManager } from '../../../src/templates/ValidationManager';

describe('ValidationManager', () => {
    let manager: ValidationManager;
    let validation: Validation;

    beforeEach(() => {
        manager = new ValidationManager();
        validation = new Validation('test.yaml', 'test-stack', 'test-changeset');
    });

    it('should add validation', () => {
        manager.add(validation);
        expect(manager.get('test-stack')).toBe(validation);
    });

    it('should get validation by stack name', () => {
        manager.add(validation);
        const retrieved = manager.get('test-stack');
        expect(retrieved).toBe(validation);
    });

    it('should return undefined for non-existent stack', () => {
        const retrieved = manager.get('non-existent');
        expect(retrieved).toBeUndefined();
    });

    it('should remove validation', () => {
        manager.add(validation);
        manager.remove('test-stack');
        expect(manager.get('test-stack')).toBeUndefined();
    });

    it('should replace existing validation for same stack', () => {
        const validation2 = new Validation('test2.yaml', 'test-stack', 'test-changeset-2');

        manager.add(validation);
        manager.add(validation2);

        expect(manager.get('test-stack')).toBe(validation2);
    });
});
