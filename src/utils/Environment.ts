const AwsEnvironment = {
    ALPHA: 'alpha',
    BETA: 'beta',
    PROD: 'prod',
};

const NodeEnvironment = {
    development: 'development',
    production: 'production',
    test: 'test',
};

export const AwsEnv = getAwsEnv();
export const NodeEnv = getNodeEnv();

export const isProd = getAwsEnv() === AwsEnvironment.PROD;
export const isBeta = getAwsEnv() === AwsEnvironment.BETA;
export const isDev = getAwsEnv() === AwsEnvironment.ALPHA;
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
