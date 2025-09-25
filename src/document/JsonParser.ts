import { parse, Allow } from 'partial-json';

export function parseJson(jsonString: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return parse(jsonString, Allow.ALL);
}
