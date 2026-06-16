import { homedir, hostname } from 'os';
import { LoggerFactory } from '../telemetry/LoggerFactory';

let sensitiveWords: string[] | undefined;

/**
 * Returns a list of strings that callers should treat as sensitive and redact from
 * any text — typically error stack traces — before it leaves the process (e.g. is
 * sent to telemetry or logged externally).
 *
 * The list is built from the language server's install location and the local machine
 * identity, since these values commonly appear in Node.js stack traces and may contain
 * personally identifiable information such as a username embedded in a home directory.
 *
 * Composition of the returned array:
 *  - The full trimmed value of `__dirname` (the entire install path).
 *  - Each non-trivial path segment of `__dirname`, obtained by normalizing
 *    backslashes to forward slashes, splitting on `/` and `:`, trimming each segment,
 *    and discarding segments of length 0 or 1 (which would over-match if redacted).
 *  - The machine `hostname()`.
 *  - The current user's `homedir()`.
 *
 * If reading `__dirname` throws (e.g. in an exotic runtime), the segment list falls
 * back to `[hostname(), homedir()]` and a warning is logged via
 * {@link LoggerFactory}.
 *
 * @returns An array of strings to redact from outbound diagnostic text. Callers should
 *          treat the array as read-only.

 */
export function sensitiveInfo(): string[] {
    if (sensitiveWords !== undefined) {
        return sensitiveWords;
    }

    try {
        sensitiveWords = __dirname
            .replaceAll('\\\\', '/')
            .replaceAll('\\', '/')
            .split(/[/:]/)
            .map((x) => {
                return x.trim();
            })
            .filter((x) => {
                return x.length > 1;
            });
    } catch (err) {
        LoggerFactory.getLogger('SensitiveInfo').warn(err, 'Cannot get __dirname');
        sensitiveWords = [hostname(), homedir()];
    }

    sensitiveWords = [__dirname.trim(), ...sensitiveWords, hostname(), homedir()];
    return sensitiveWords;
}

export function sanitizeMessage(message: string): string {
    if (!message) {
        return message;
    }

    return message
        .trim()
        .split('\n')
        .map((line) => {
            let newLine = line.trim();
            for (const word of sensitiveInfo()) {
                if (word !== 'aws' && word !== 'cloudformation-languageserver') {
                    newLine = newLine.replaceAll(word, '[*]');
                }
            }

            return newLine.replaceAll('\\\\', '/').replaceAll('\\', '/');
        })
        .map((line) => {
            return line
                .replaceAll(/arn:aws[^:\s]*:\S+\d{12}\S*/gi, 'arn:aws:<REDACTED>')
                .replaceAll(/\b\d{12}\b/g, '<ACCOUNT_ID>');
        })
        .join('\n');
}
