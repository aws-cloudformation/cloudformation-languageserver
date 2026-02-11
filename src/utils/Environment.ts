/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ExtensionId, ExtensionVersion } from './ExtensionConfig';

const AwsEnvironment = Object.freeze({
    alpha: 'alpha',
    beta: 'beta',
    prod: 'prod',
} as const);

const NodeEnvironment = Object.freeze({
    development: 'development',
    production: 'production',
    test: 'test',
} as const);

const processAwsEnv = process.env.AWS_ENV;
const processNodeEnv = process.env.NODE_ENV;

// @ts-expect-error
if (processAwsEnv && !Object.values(AwsEnvironment).includes(processAwsEnv)) {
    throw new Error(`Unknown AWS_ENV=${processAwsEnv} and NODE_ENV=${processNodeEnv}`);
}

// @ts-expect-error
if (processNodeEnv && !Object.values(NodeEnvironment).includes(processNodeEnv)) {
    throw new Error(`Unknown AWS_ENV=${processAwsEnv} and NODE_ENV=${processNodeEnv}`);
}

export const AwsEnv = getAwsEnv();

export const isTest = getNodeEnv() === NodeEnvironment.test;
export const isProd = getAwsEnv() === AwsEnvironment.prod;
export const isBeta = getAwsEnv() === AwsEnvironment.beta;
export const isAlpha = getAwsEnv() === AwsEnvironment.alpha;

function getAwsEnv() {
    if (getNodeEnv() === NodeEnvironment.test) {
        return processAwsEnv ?? AwsEnvironment.alpha;
    }

    if (getNodeEnv() === NodeEnvironment.development) {
        return processAwsEnv ?? AwsEnvironment.alpha;
    }

    switch (processAwsEnv) {
        case AwsEnvironment.alpha: {
            return AwsEnvironment.alpha;
        }
        case AwsEnvironment.beta: {
            return AwsEnvironment.beta;
        }
        case AwsEnvironment.prod: {
            return AwsEnvironment.prod;
        }
        default: {
            throw new Error(`Unknown AWS_ENV=${processAwsEnv} and NODE_ENV=${processNodeEnv}`);
        }
    }
}

function getNodeEnv() {
    switch (processNodeEnv) {
        case NodeEnvironment.development: {
            return NodeEnvironment.development;
        }
        case NodeEnvironment.production: {
            return NodeEnvironment.production;
        }
        case NodeEnvironment.test: {
            return NodeEnvironment.test;
        }
        default: {
            throw new Error(`Unknown AWS_ENV=${processAwsEnv} and NODE_ENV=${processNodeEnv}`);
        }
    }
}

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

export const ProcessType = `${process.platform}${process.env.BUILD_TARGET ? `-${process.env.BUILD_TARGET}` : ''}-${process.arch}`;
export const ServiceEnv = `${getNodeEnv()}-${getAwsEnv()}`;
export const Service = `${ExtensionId}-${ExtensionVersion}`;
