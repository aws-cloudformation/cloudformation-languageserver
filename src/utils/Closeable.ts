import { extractErrorMessage } from './Errors';

export interface Closeable<T = void | Promise<void>> {
    close(): T;
}

export async function closeSafely(...closeables: Closeable[]): Promise<void> {
    const exceptions: string[] = [];
    for (const obj of closeables) {
        try {
            await obj.close();
        } catch (e) {
            exceptions.push(extractErrorMessage(e));
        }
    }

    if (exceptions.length > 0) {
        throw new Error(`${exceptions.length} errors closing objects\n${exceptions.join('; ')}`);
    }
}
