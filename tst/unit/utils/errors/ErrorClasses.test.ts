import { describe, expect, test } from 'vitest';
import { DoesNotExist } from '../../../../src/utils/errors/ErrorClasses';

describe('ErrorClasses', () => {
    describe('DoesNotExist', () => {
        test('formats the message with the supplied resource name', () => {
            const error = new DoesNotExist('Stack arn');
            expect(error.message).toBe('Stack arn does not exist');
        });

        test('sets the error name to DoesNotExist', () => {
            expect(new DoesNotExist('thing').name).toBe('DoesNotExist');
        });

        test('survives instanceof Error', () => {
            expect(new DoesNotExist('thing')).toBeInstanceOf(Error);
        });

        test('survives instanceof DoesNotExist (prototype chain preserved)', () => {
            expect(new DoesNotExist('thing')).toBeInstanceOf(DoesNotExist);
        });

        test('preserves the cause from ErrorOptions', () => {
            const cause = new Error('underlying io error');
            const error = new DoesNotExist('Stack arn', { cause });
            expect(error.cause).toBe(cause);
        });

        test('is throwable and catchable as an Error', () => {
            try {
                throw new DoesNotExist('Resource X');
            } catch (err) {
                expect(err).toBeInstanceOf(DoesNotExist);
                expect(err).toBeInstanceOf(Error);
                expect((err as Error).message).toBe('Resource X does not exist');
            }
        });
    });
});
