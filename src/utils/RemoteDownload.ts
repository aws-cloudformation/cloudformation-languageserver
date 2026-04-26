import axios from 'axios';
import { LoggerFactory } from '../telemetry/LoggerFactory';

export async function downloadFile(url: string): Promise<Buffer> {
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
    });

    LoggerFactory.getLogger('Remote').info(`Fetching ${url}`);
    return Buffer.from(response.data);
}

export async function downloadJson<T = unknown>(url: string): Promise<T> {
    LoggerFactory.getLogger('Remote').info(`Fetching ${url}`);
    const response = await axios<T>({
        method: 'get',
        url: url,
    });

    return response.data;
}
