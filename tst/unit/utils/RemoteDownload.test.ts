import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, downloadJson } from '../../../src/utils/RemoteDownload';

vi.mock('axios', () => ({ default: vi.fn() }));

const DownloadTimeoutMs = 10 * 60 * 1000;

describe('RemoteDownload', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(Math, 'random').mockReturnValue(0);
        vi.mocked(axios).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should retry file download failures', async () => {
        vi.mocked(axios)
            .mockRejectedValueOnce(new Error('temporary failure'))
            .mockResolvedValue({ data: Buffer.from('schema') });

        const resultPromise = downloadFile('https://example.com/schema.zip');
        await vi.advanceTimersByTimeAsync(1000);

        await expect(resultPromise).resolves.toEqual(Buffer.from('schema'));
        expect(axios).toHaveBeenCalledTimes(2);
        expect(axios).toHaveBeenLastCalledWith(
            expect.objectContaining({
                method: 'get',
                url: 'https://example.com/schema.zip',
                timeout: DownloadTimeoutMs,
            }),
        );
    });

    it('should retry JSON download failures', async () => {
        vi.mocked(axios)
            .mockRejectedValueOnce(new Error('temporary failure'))
            .mockResolvedValue({ data: { version: 1 } });

        const resultPromise = downloadJson<{ version: number }>('https://example.com/config.json');
        await vi.advanceTimersByTimeAsync(1000);

        await expect(resultPromise).resolves.toEqual({ version: 1 });
        expect(axios).toHaveBeenCalledTimes(2);
        expect(axios).toHaveBeenLastCalledWith(
            expect.objectContaining({
                method: 'get',
                url: 'https://example.com/config.json',
                timeout: DownloadTimeoutMs,
            }),
        );
    });

    it('should retry HTTP failures', async () => {
        const notFoundError = Object.assign(new Error('not found'), { response: { status: 404 } });
        vi.mocked(axios)
            .mockRejectedValueOnce(notFoundError)
            .mockResolvedValue({ data: { version: 1 } });

        const resultPromise = downloadJson<{ version: number }>('https://example.com/config.json');
        await vi.advanceTimersByTimeAsync(1000);

        await expect(resultPromise).resolves.toEqual({ version: 1 });
        expect(axios).toHaveBeenCalledTimes(2);
    });

    it('should retry TLS failures', async () => {
        const tlsError = Object.assign(new Error('self-signed certificate in certificate chain'), {
            code: 'SELF_SIGNED_CERT_IN_CHAIN',
        });
        vi.mocked(axios)
            .mockRejectedValueOnce(tlsError)
            .mockResolvedValue({ data: Buffer.from('schema') });

        const resultPromise = downloadFile('https://example.com/schema.zip');
        await vi.advanceTimersByTimeAsync(1000);

        await expect(resultPromise).resolves.toEqual(Buffer.from('schema'));
        expect(axios).toHaveBeenCalledTimes(2);
    });

    it('should preserve the original error after retries are exhausted', async () => {
        const timeoutError = Object.assign(new Error('timeout of 600000ms exceeded'), { code: 'ECONNABORTED' });
        vi.mocked(axios).mockRejectedValue(timeoutError);

        const resultPromise = downloadFile('https://example.com/schema.zip').catch((error: unknown) => error);
        await vi.runAllTimersAsync();

        await expect(resultPromise).resolves.toBe(timeoutError);
        expect(axios).toHaveBeenCalledTimes(6);
    });
});
