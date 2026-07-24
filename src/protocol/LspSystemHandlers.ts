import { Connection, RequestHandler, RequestType } from 'vscode-languageserver';
import { Settings } from '../settings/Settings';
import { ReadinessStatus } from '../utils/ReadinessContributor';
import * as v8 from 'v8';

export type GetSystemStatusResponse = {
    settingsReady: ReadinessStatus;
    schemasReady: ReadinessStatus;
    cfnLintReady: ReadinessStatus;
    cfnGuardReady: ReadinessStatus;
    currentSettings: Settings;
};

export type MemoryStatsResponse = {
    rss_mb: number;
    heap_used_mb: number;
    heap_total_mb: number;
    heap_limit_mb: number;
    external_mb: number;
    array_buffers_mb: number;
    wasm_mb: number;
};

export const GetSystemStatusRequestType = new RequestType<void, GetSystemStatusResponse, void>('aws/system/status');
export const GetMemoryStatsRequestType = new RequestType<void, MemoryStatsResponse, void>('aws/debug/memory');

export class LspSystemHandlers {
    constructor(private readonly connection: Connection) {}

    onGetSystemStatus(handler: RequestHandler<void, GetSystemStatusResponse, void>) {
        this.connection.onRequest(GetSystemStatusRequestType.method, handler);
    }

    registerMemoryStats(getWasmBytes?: () => Promise<number>) {
        this.connection.onRequest(GetMemoryStatsRequestType.method, async () => {
            const mem = process.memoryUsage();
            const heap = v8.getHeapStatistics();
            const wasmBytes = getWasmBytes ? await getWasmBytes() : 0;
            return {
                rss_mb: Math.round(mem.rss / 1048576),
                heap_used_mb: Math.round(mem.heapUsed / 1048576),
                heap_total_mb: Math.round(mem.heapTotal / 1048576),
                heap_limit_mb: Math.round(heap.heap_size_limit / 1048576),
                external_mb: Math.round(mem.external / 1048576),
                array_buffers_mb: Math.round(mem.arrayBuffers / 1048576),
                wasm_mb: Math.round(wasmBytes / 1048576),
            };
        });
    }
}
