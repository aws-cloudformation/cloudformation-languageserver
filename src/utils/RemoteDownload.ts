import axios from 'axios';

export async function downloadFile(url: string): Promise<Buffer> {
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
}

export async function downloadJson<T = unknown>(url: string): Promise<T> {
    const response = await axios<T>({
        method: 'get',
        url: url,
    });

    return response.data;
}
