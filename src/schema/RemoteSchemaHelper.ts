import axios from 'axios';
import { ZipFile, fromBuffer, Entry } from 'yauzl';
import { AwsRegion } from '../utils/Region';
import { SchemaFileType } from './RegionalSchemas';

export function cfnResourceSchemaLink(region: AwsRegion) {
    if ([AwsRegion.CN_NORTH_1, AwsRegion.CN_NORTHWEST_1].includes(region)) {
        return `https://schema.cloudformation.${region}.amazonaws.com.cn/CloudformationSchema.zip`;
    }

    return `https://schema.cloudformation.${region}.amazonaws.com/CloudformationSchema.zip`;
}

export async function downloadFile(url: string): Promise<Buffer> {
    const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
}

export async function unZipFile(buffer: Promise<Buffer>): Promise<SchemaFileType[]> {
    return await buffer.then((zipBuffer) => {
        return new Promise((resolve, reject) => {
            fromBuffer(
                zipBuffer,
                {
                    lazyEntries: true,
                    autoClose: true,
                },
                (err: Error | null, zipFile: ZipFile) => {
                    if (err) {
                        return reject(new Error(err.message));
                    } else if (!zipFile) {
                        return reject(new Error('Failed to open ZIP file'));
                    }

                    const files: SchemaFileType[] = [];

                    zipFile.on('entry', (entry: Entry) => {
                        zipFile.openReadStream(entry, (err, readStream) => {
                            if (err || !readStream) {
                                return reject(err ?? new Error(`Failed to read entry: ${entry.fileName}`));
                            }

                            const chunks: Buffer[] = [];

                            readStream.on('data', (chunk: Buffer) => {
                                chunks.push(chunk);
                            });

                            readStream.on('end', () => {
                                const content = Buffer.concat(chunks);
                                files.push({
                                    name: entry.fileName,
                                    content: content.toString('utf8'),
                                    createdMs: Date.now(),
                                });

                                zipFile.readEntry();
                            });

                            readStream.on('error', (err) => {
                                return reject(err);
                            });
                        });
                    });

                    zipFile.on('end', () => {
                        resolve(files);
                    });

                    zipFile.on('error', (err) => {
                        return reject(new Error(String(err)));
                    });

                    zipFile.readEntry();
                },
            );
        });
    });
}

export async function downloadJson<T = unknown>(url: string): Promise<T> {
    const response = await axios<T>({
        method: 'get',
        url: url,
    });

    return response.data;
}
