const AwsEnvironment = Object.freeze({
    ALPHA: 'alpha',
    BETA: 'beta',
    PROD: 'prod',
} as const);

const NodeEnvironment = Object.freeze({
    development: 'development',
    production: 'production',
    test: 'test',
} as const);

export const AwsEnv = getAwsEnv();
export const NodeEnv = getNodeEnv();

export const isTest = getNodeEnv() === NodeEnvironment.test;
export const isProd = getAwsEnv() === AwsEnvironment.PROD;
export const isBeta = getAwsEnv() === AwsEnvironment.BETA;
export const isAlpha = getAwsEnv() === AwsEnvironment.ALPHA;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const IsAppEnvironment = Object.values(AwsEnvironment).includes(AwsEnv);

function getAwsEnv() {
    if (getNodeEnv() === NodeEnvironment.test) {
        return process.env.AWS_ENV ?? NodeEnvironment.test;
    }

    if (process.env.NODE_ENV === NodeEnvironment.development) {
        return AwsEnvironment.ALPHA;
    }

    switch (process.env.AWS_ENV) {
        case AwsEnvironment.ALPHA: {
            return AwsEnvironment.ALPHA;
        }
        case AwsEnvironment.BETA: {
            return AwsEnvironment.BETA;
        }
        case AwsEnvironment.PROD: {
            return AwsEnvironment.PROD;
        }
        default: {
            throw new Error(`Unknown AWS_ENV=${process.env.AWS_ENV} and NODE_ENV=${process.env.NODE_ENV}`);
        }
    }
}

function getNodeEnv() {
    switch (process.env.NODE_ENV) {
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
            throw new Error(`Unknown AWS_ENV=${process.env.AWS_ENV} and NODE_ENV=${process.env.NODE_ENV}`);
        }
    }
}
