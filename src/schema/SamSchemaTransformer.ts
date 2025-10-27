export interface SamSchema {
    definitions: Record<string, unknown>;
    properties: {
        Resources: {
            additionalProperties: {
                anyOf: Array<{ $ref: string }>;
            };
        };
    };
}

interface CloudFormationResourceSchema {
    typeName: string;
    description: string;
    documentationUrl?: string;
    properties: Record<string, unknown>;
    definitions?: Record<string, unknown>;
    additionalProperties: boolean;
    required?: string[];
    readOnlyProperties?: string[];
    writeOnlyProperties?: string[];
    createOnlyProperties?: string[];
    primaryIdentifier?: string[];
    attributes?: Record<string, unknown>;
}

export class SamSchemaTransformer {
    private static readonly SAM_RESOURCE_DESCRIPTIONS = {
        'AWS::Serverless::Function':
            'Creates a Lambda function, IAM execution role, and event source mappings which trigger the function.',
        'AWS::Serverless::Api': 'Creates an Amazon API Gateway REST API, which can be managed by Amazon API Gateway.',
        'AWS::Serverless::HttpApi':
            'Creates an Amazon API Gateway HTTP API, which can be managed by Amazon API Gateway.',
        'AWS::Serverless::SimpleTable': 'Creates a DynamoDB table with a single attribute primary key.',
        'AWS::Serverless::LayerVersion':
            'Creates a Lambda LayerVersion that contains library or runtime code needed by a Lambda function.',
        'AWS::Serverless::Application':
            'Embeds a serverless application from the AWS Serverless Application Repository or from an Amazon S3 bucket.',
        'AWS::Serverless::StateMachine':
            'Creates an AWS Step Functions state machine, which can be managed by Step Functions.',
        'AWS::Serverless::Connector': 'Manages permissions between AWS resources.',
        'AWS::Serverless::GraphQLApi': 'Creates an AWS AppSync GraphQL API.',
    };

    private static getDocumentationUrl(resourceType: string): string {
        const urlMap: Record<string, string> = {
            'AWS::Serverless::Function':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html',
            'AWS::Serverless::Api':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html',
            'AWS::Serverless::HttpApi':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html',
            'AWS::Serverless::SimpleTable':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-simpletable.html',
            'AWS::Serverless::LayerVersion':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-layerversion.html',
            'AWS::Serverless::Application':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-application.html',
            'AWS::Serverless::StateMachine':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-statemachine.html',
            'AWS::Serverless::Connector':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-connector.html',
            'AWS::Serverless::GraphQLApi':
                'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-graphqlapi.html',
        };
        return urlMap[resourceType] || '';
    }

    static transformSamSchema(samSchema: SamSchema): Map<string, CloudFormationResourceSchema> {
        const resourceSchemas = new Map<string, CloudFormationResourceSchema>();

        // Extract resource references from Resources.additionalProperties.anyOf
        const resourceRefs = samSchema.properties.Resources.additionalProperties.anyOf
            .map((ref) => ref.$ref.replace('#/definitions/', ''))
            .filter((ref) => ref.includes('aws_serverless') && ref.endsWith('Resource'));

        for (const defKey of resourceRefs) {
            const definition = samSchema.definitions[defKey] as Record<string, unknown>;
            if (!definition) continue;

            // Extract resource type from the definition
            const typeEnum = (definition.properties as Record<string, unknown>)?.Type as Record<string, unknown>;
            if (!typeEnum?.enum || !Array.isArray(typeEnum.enum) || typeEnum.enum.length === 0) continue;

            const resourceType = typeEnum.enum[0] as string;

            // Get properties from the Properties field, following $ref if needed
            let propertiesSchema = (definition.properties as Record<string, unknown>)?.Properties as Record<
                string,
                unknown
            >;
            if (propertiesSchema?.$ref) {
                const refKey = (propertiesSchema.$ref as string).replace('#/definitions/', '');
                propertiesSchema = samSchema.definitions[refKey] as Record<string, unknown>;
            }

            const cfnSchema: CloudFormationResourceSchema = {
                typeName: resourceType,
                description:
                    SamSchemaTransformer.SAM_RESOURCE_DESCRIPTIONS[
                        resourceType as keyof typeof SamSchemaTransformer.SAM_RESOURCE_DESCRIPTIONS
                    ] ??
                    (definition.title as string) ??
                    `${resourceType} resource`,
                documentationUrl: this.getDocumentationUrl(resourceType),
                properties: (propertiesSchema?.properties as Record<string, unknown>) ?? {},
                definitions: samSchema.definitions,
                additionalProperties: false,
                required: (propertiesSchema?.required as string[]) ?? [],
                attributes: {}, // Empty to avoid GetAtt issues
                readOnlyProperties: [],
                writeOnlyProperties: [],
                createOnlyProperties: [],
                primaryIdentifier: [],
            };

            resourceSchemas.set(resourceType, cfnSchema);
        }

        return resourceSchemas;
    }
}
