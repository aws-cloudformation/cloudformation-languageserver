import axios, { AxiosProxyConfig } from 'axios';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { retryWithExponentialBackoff } from './Retry';

const DownloadTimeoutMs = 10 * 60 * 1000;
const DownloadRetryTimeoutMs = 60 * 60 * 1000;
const log = LoggerFactory.getLogger('Remote');

function getProxyConfig(): AxiosProxyConfig | undefined {
    const proxyUrl =
        process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
    if (!proxyUrl) return undefined;

    const parsed = new URL(proxyUrl);
    return {
        host: parsed.hostname,
        port: Number.parseInt(parsed.port, 10), // radix 10 for decimal parsing
        // URL.protocol includes trailing colon (e.g. "http:"), strip it for axios config
        protocol: parsed.protocol.replace(':', ''),
    };
}

export async function downloadFile(url: string): Promise<Buffer> {
    log.info(`Fetching ${url}`);

    const response = await retryWithExponentialBackoff(
        () => {
            return axios({
                method: 'get',
                url,
                responseType: 'arraybuffer',
                proxy: getProxyConfig(),
                maxRedirects: 7,
                timeout: DownloadTimeoutMs,
            });
        },
        {
            operationName: `FileDownload ${url}`,
            totalTimeoutMs: DownloadRetryTimeoutMs,
            maxRetries: 5,
        },
        log,
    );

    return Buffer.from(response.data);
}

export async function downloadJson<T = unknown>(url: string): Promise<T> {
    log.info(`Fetching ${url}`);

    const response = await retryWithExponentialBackoff(
        () => {
            return axios<T>({
                method: 'get',
                url,
                proxy: getProxyConfig(),
                maxRedirects: 7,
                timeout: DownloadTimeoutMs,
            });
        },
        {
            operationName: `FileDownload ${url}`,
            totalTimeoutMs: DownloadRetryTimeoutMs,
            maxRetries: 5,
        },
        log,
    );

    return response.data;
}
