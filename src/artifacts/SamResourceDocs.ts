export const SAM_RESOURCE_DESCRIPTIONS: ReadonlyMap<string, string> = new Map([
    [
        'AWS::Serverless::Function',
        'Creates a Lambda function, IAM execution role, and event source mappings which trigger the function.',
    ],
    ['AWS::Serverless::Api', 'Creates an Amazon API Gateway REST API, which can be managed by Amazon API Gateway.'],
    ['AWS::Serverless::HttpApi', 'Creates an Amazon API Gateway HTTP API, which can be managed by Amazon API Gateway.'],
    ['AWS::Serverless::SimpleTable', 'Creates a DynamoDB table with a single attribute primary key.'],
    [
        'AWS::Serverless::LayerVersion',
        'Creates a Lambda LayerVersion that contains library or runtime code needed by a Lambda function.',
    ],
    [
        'AWS::Serverless::Application',
        'Embeds a serverless application from the AWS Serverless Application Repository or from an Amazon S3 bucket.',
    ],
    [
        'AWS::Serverless::StateMachine',
        'Creates an AWS Step Functions state machine, which can be managed by Step Functions.',
    ],
    ['AWS::Serverless::Connector', 'Manages permissions between AWS resources.'],
    ['AWS::Serverless::GraphQLApi', 'Creates an AWS AppSync GraphQL API.'],
]);

export const SAM_DOCUMENTATION_URLS: ReadonlyMap<string, string> = new Map([
    [
        'AWS::Serverless::Function',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html',
    ],
    [
        'AWS::Serverless::Api',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html',
    ],
    [
        'AWS::Serverless::HttpApi',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html',
    ],
    [
        'AWS::Serverless::SimpleTable',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-simpletable.html',
    ],
    [
        'AWS::Serverless::LayerVersion',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-layerversion.html',
    ],
    [
        'AWS::Serverless::Application',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-application.html',
    ],
    [
        'AWS::Serverless::StateMachine',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-statemachine.html',
    ],
    [
        'AWS::Serverless::Connector',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-connector.html',
    ],
    [
        'AWS::Serverless::GraphQLApi',
        'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-graphqlapi.html',
    ],
]);
