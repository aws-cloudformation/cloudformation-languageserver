import axios, { AxiosProxyConfig } from 'axios';
import { LoggerFactory } from '../telemetry/LoggerFactory';

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
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        proxy: getProxyConfig(),
    });

    LoggerFactory.getLogger('Remote').info(`Fetching ${url}`);
    return Buffer.from(response.data);
}

export async function downloadJson<T = unknown>(url: string): Promise<T> {
    LoggerFactory.getLogger('Remote').info(`Fetching ${url}`);
    const response = await axios<T>({
        method: 'get',
        url: url,
        proxy: getProxyConfig(),
    });

    return response.data;
}
