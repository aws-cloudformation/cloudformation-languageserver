import StackUtils from 'stack-utils';
import { LoggerFactory } from '../telemetry/LoggerFactory';

let errorStackInfo: string[] | undefined;

export function determineSensitiveInfo(): string[] {
    if (errorStackInfo !== undefined) {
        return errorStackInfo;
    }

    try {
        errorStackInfo = __dirname
            .replaceAll('\\\\', '/')
            .replaceAll('\\', '/')
            .split('/')
            .map((x) => {
                return x.trim();
            })
            .filter((x) => {
                return x.length > 0;
            });
    } catch (err) {
        LoggerFactory.getLogger('SensitiveInfo').warn(err, 'Cannot get __dirname');
        errorStackInfo = [];
    }

    return errorStackInfo;
}

export function getErrorStack() {
    try {
        return new StackUtils({ cwd: process.cwd() });
    } catch (err) {
        LoggerFactory.getLogger('SensitiveInfo').warn(err, 'Cannot get process.cwd()');
        return new StackUtils();
    }
}
