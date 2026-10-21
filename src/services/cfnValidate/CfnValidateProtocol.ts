import type { Worker } from 'worker_threads';
import type { Severity, ValidationReport } from '@aws/cloudformation-validate';

export interface CfnValidateOptions {
    readonly severityLevel: Severity;
}

export interface CfnValidateRequest {
    readonly id: number;
    readonly content: string;
    readonly path: string;
    readonly severityLevel: Severity;
}

export type CfnValidateResponse =
    | { readonly ready: string }
    | { readonly id: number; readonly report: ValidationReport }
    | { readonly id: number; readonly error: { name: string; message: string; stack?: string } };

export type CfnValidateWorkerFactory = () => Worker;
