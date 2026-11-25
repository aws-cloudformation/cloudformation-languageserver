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

    it('should retry and bound file downloads', async () => {
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

    it('should retry and bound JSON downloads', async () => {
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
});
