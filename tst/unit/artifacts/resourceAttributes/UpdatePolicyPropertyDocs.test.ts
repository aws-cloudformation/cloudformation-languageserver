import { describe, expect, it } from 'vitest';
import {
    updatePolicyPropertyDocsMap,
    UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    supportsUpdatePolicy,
    supportsAutoScalingUpdatePolicy,
    supportsElastiCacheUpdatePolicy,
    supportsOpenSearchUpdatePolicy,
    supportsLambdaUpdatePolicy,
    supportsAppStreamUpdatePolicy,
    UPDATE_POLICY_SCHEMA,
} from '../../../../src/artifacts/resourceAttributes/UpdatePolicyPropertyDocs';
import {
    ResourceAttribute,
    UpdatePolicyProperty,
    AutoScalingRollingUpdateProperty,
    AutoScalingReplacingUpdateProperty,
    AutoScalingScheduledActionProperty,
    CodeDeployLambdaAliasUpdateProperty,
} from '../../../../src/context/CloudFormationEnums';

describe('UpdatePolicyPropertyDocs', () => {
    describe('updatePolicyPropertyDocsMap', () => {
        describe('AutoScalingRollingUpdate', () => {
            it('returns documentation with source link for AutoScalingRollingUpdate policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**AutoScalingRollingUpdate**');
                expect(doc).toContain('rolling update');
                expect(doc).toContain('[Source Documentation]');
                expect(doc).toContain('aws-attribute-updatepolicy.html');
            });

            it('returns MaxBatchSize documentation with default and maximum values', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MaxBatchSize}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**MaxBatchSize**');
                expect(doc).toContain('*Default*: 1');
                expect(doc).toContain('*Maximum*: 100');
                expect(doc).toContain('*Type*: Integer');
            });

            it('returns MinActiveInstancesPercent documentation with percentage range info', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MinActiveInstancesPercent}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**MinActiveInstancesPercent**');
                expect(doc).toContain('0 to 100');
                expect(doc).toContain('*Default*: 100');
                expect(doc).toContain('InService');
            });

            it('returns PauseTime documentation with ISO8601 duration format', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.PauseTime}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**PauseTime**');
                expect(doc).toContain('ISO8601');
                expect(doc).toContain('PT#H#M#S');
                expect(doc).toContain('PT1H');
                expect(doc).toContain('*Type*: String');
            });

            it('returns WaitOnResourceSignals documentation with conditional requirement', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.WaitOnResourceSignals}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**WaitOnResourceSignals**');
                expect(doc).toContain('cfn-signal');
                expect(doc).toContain('*Required*: Conditional');
                expect(doc).toContain('MinSuccessfulInstancesPercent');
            });

            it('returns SuspendProcesses documentation with link to process types', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.SuspendProcesses}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**SuspendProcesses**');
                expect(doc).toContain('Types of processes');
                expect(doc).toContain('*Type*: List of Auto Scaling processes');
            });
        });

        describe('AutoScalingReplacingUpdate', () => {
            it('returns documentation for AutoScalingReplacingUpdate policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingReplacingUpdate}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**AutoScalingReplacingUpdate**');
                expect(doc).toContain('replace the Auto Scaling group');
                expect(doc).toContain('sufficient Amazon EC2 capacity');
            });

            it('returns WillReplace documentation with rollback behavior', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingReplacingUpdate}.${AutoScalingReplacingUpdateProperty.WillReplace}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**WillReplace**');
                expect(doc).toContain('roll back');
                expect(doc).toContain('CreationPolicy');
                expect(doc).toContain('*Type*: Boolean');
            });
        });

        describe('AutoScalingScheduledAction', () => {
            it('returns documentation for AutoScalingScheduledAction policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingScheduledAction}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**AutoScalingScheduledAction**');
                expect(doc).toContain('MinSize');
                expect(doc).toContain('MaxSize');
                expect(doc).toContain('DesiredCapacity');
            });

            it('returns IgnoreUnmodifiedGroupSizeProperties documentation', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingScheduledAction}.${AutoScalingScheduledActionProperty.IgnoreUnmodifiedGroupSizeProperties}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**IgnoreUnmodifiedGroupSizeProperties**');
                expect(doc).toContain('*Default*: false');
                expect(doc).toContain('*Type*: Boolean');
            });
        });

        describe('UseOnlineResharding', () => {
            it('returns documentation for ElastiCache UseOnlineResharding policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.UseOnlineResharding}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**UseOnlineResharding**');
                expect(doc).toContain('AWS::ElastiCache::ReplicationGroup');
                expect(doc).toContain('NumNodeGroups');
                expect(doc).toContain('NodeGroupConfiguration');
            });
        });

        describe('EnableVersionUpgrade', () => {
            it('returns documentation for OpenSearch EnableVersionUpgrade policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.EnableVersionUpgrade}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**EnableVersionUpgrade**');
                expect(doc).toContain('AWS::OpenSearchService::Domain');
                expect(doc).toContain('AWS::Elasticsearch::Domain');
                expect(doc).toContain('EngineVersion');
            });
        });

        describe('CodeDeployLambdaAliasUpdate', () => {
            it('returns documentation for CodeDeployLambdaAliasUpdate policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**CodeDeployLambdaAliasUpdate**');
                expect(doc).toContain('AWS::Lambda::Alias');
                expect(doc).toContain('CodeDeploy');
            });

            it('returns ApplicationName documentation as required field', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.ApplicationName}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**ApplicationName**');
                expect(doc).toContain('*Required*: Yes');
                expect(doc).toContain('*Type*: String');
            });

            it('returns DeploymentGroupName documentation with traffic-shifting info', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.DeploymentGroupName}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**DeploymentGroupName**');
                expect(doc).toContain('traffic-shifting');
                expect(doc).toContain('*Required*: Yes');
            });

            it('returns BeforeAllowTrafficHook documentation as optional', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.BeforeAllowTrafficHook}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**BeforeAllowTrafficHook**');
                expect(doc).toContain('before traffic routing');
                expect(doc).toContain('*Required*: No');
            });
        });

        describe('AppStream policies', () => {
            it('returns documentation for StopBeforeUpdate policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.StopBeforeUpdate}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**StopBeforeUpdate**');
                expect(doc).toContain('Stops the specified fleet');
            });

            it('returns documentation for StartAfterUpdate policy', () => {
                const key = `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.StartAfterUpdate}`;
                const doc = updatePolicyPropertyDocsMap.get(key);

                expect(doc).toContain('**StartAfterUpdate**');
                expect(doc).toContain('Starts the specified fleet');
            });
        });
    });

    describe('supportsUpdatePolicy', () => {
        it('returns true for AWS::AutoScaling::AutoScalingGroup', () => {
            expect(supportsUpdatePolicy('AWS::AutoScaling::AutoScalingGroup')).toBe(true);
        });

        it('returns true for AWS::ElastiCache::ReplicationGroup', () => {
            expect(supportsUpdatePolicy('AWS::ElastiCache::ReplicationGroup')).toBe(true);
        });

        it('returns true for AWS::OpenSearchService::Domain', () => {
            expect(supportsUpdatePolicy('AWS::OpenSearchService::Domain')).toBe(true);
        });

        it('returns true for AWS::Elasticsearch::Domain', () => {
            expect(supportsUpdatePolicy('AWS::Elasticsearch::Domain')).toBe(true);
        });

        it('returns true for AWS::Lambda::Alias', () => {
            expect(supportsUpdatePolicy('AWS::Lambda::Alias')).toBe(true);
        });

        it('returns true for AWS::AppStream::Fleet', () => {
            expect(supportsUpdatePolicy('AWS::AppStream::Fleet')).toBe(true);
        });

        it('returns false for AWS::EC2::Instance', () => {
            expect(supportsUpdatePolicy('AWS::EC2::Instance')).toBe(false);
        });

        it('returns false for AWS::S3::Bucket', () => {
            expect(supportsUpdatePolicy('AWS::S3::Bucket')).toBe(false);
        });
    });

    describe('supportsAutoScalingUpdatePolicy', () => {
        it('returns true only for AWS::AutoScaling::AutoScalingGroup', () => {
            expect(supportsAutoScalingUpdatePolicy('AWS::AutoScaling::AutoScalingGroup')).toBe(true);
            expect(supportsAutoScalingUpdatePolicy('AWS::Lambda::Alias')).toBe(false);
            expect(supportsAutoScalingUpdatePolicy('AWS::ElastiCache::ReplicationGroup')).toBe(false);
        });
    });

    describe('supportsElastiCacheUpdatePolicy', () => {
        it('returns true only for AWS::ElastiCache::ReplicationGroup', () => {
            expect(supportsElastiCacheUpdatePolicy('AWS::ElastiCache::ReplicationGroup')).toBe(true);
            expect(supportsElastiCacheUpdatePolicy('AWS::AutoScaling::AutoScalingGroup')).toBe(false);
        });
    });

    describe('supportsOpenSearchUpdatePolicy', () => {
        it('returns true for OpenSearch and Elasticsearch domains', () => {
            expect(supportsOpenSearchUpdatePolicy('AWS::OpenSearchService::Domain')).toBe(true);
            expect(supportsOpenSearchUpdatePolicy('AWS::Elasticsearch::Domain')).toBe(true);
            expect(supportsOpenSearchUpdatePolicy('AWS::Lambda::Alias')).toBe(false);
        });
    });

    describe('supportsLambdaUpdatePolicy', () => {
        it('returns true only for AWS::Lambda::Alias', () => {
            expect(supportsLambdaUpdatePolicy('AWS::Lambda::Alias')).toBe(true);
            expect(supportsLambdaUpdatePolicy('AWS::Lambda::Function')).toBe(false);
        });
    });

    describe('supportsAppStreamUpdatePolicy', () => {
        it('returns true only for AWS::AppStream::Fleet', () => {
            expect(supportsAppStreamUpdatePolicy('AWS::AppStream::Fleet')).toBe(true);
            expect(supportsAppStreamUpdatePolicy('AWS::AppStream::Stack')).toBe(false);
        });
    });

    describe('UPDATE_POLICY_SCHEMA', () => {
        it('defines AutoScalingRollingUpdate with all seven properties', () => {
            const schema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.AutoScalingRollingUpdate];

            expect(schema.type).toBe('object');
            expect(schema.supportedResourceTypes).toContain('AWS::AutoScaling::AutoScalingGroup');
            expect(Object.keys(schema.properties!)).toHaveLength(7);
            expect(schema.properties![AutoScalingRollingUpdateProperty.MaxBatchSize].type).toBe('simple');
            expect(schema.properties![AutoScalingRollingUpdateProperty.PauseTime].type).toBe('simple');
            expect(schema.properties![AutoScalingRollingUpdateProperty.WaitOnResourceSignals].type).toBe('simple');
        });

        it('defines AutoScalingReplacingUpdate with WillReplace property', () => {
            const schema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.AutoScalingReplacingUpdate];

            expect(schema.type).toBe('object');
            expect(schema.properties![AutoScalingReplacingUpdateProperty.WillReplace].type).toBe('simple');
        });

        it('defines UseOnlineResharding as simple type for ElastiCache', () => {
            const schema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.UseOnlineResharding];

            expect(schema.type).toBe('simple');
            expect(schema.supportedResourceTypes).toContain('AWS::ElastiCache::ReplicationGroup');
            expect(schema.properties).toBeUndefined();
        });

        it('defines EnableVersionUpgrade as simple type for OpenSearch domains', () => {
            const schema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.EnableVersionUpgrade];

            expect(schema.type).toBe('simple');
            expect(schema.supportedResourceTypes).toContain('AWS::OpenSearchService::Domain');
            expect(schema.supportedResourceTypes).toContain('AWS::Elasticsearch::Domain');
        });

        it('defines CodeDeployLambdaAliasUpdate with four properties', () => {
            const schema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.CodeDeployLambdaAliasUpdate];

            expect(schema.type).toBe('object');
            expect(schema.supportedResourceTypes).toContain('AWS::Lambda::Alias');
            expect(Object.keys(schema.properties!)).toHaveLength(4);
            expect(schema.properties![CodeDeployLambdaAliasUpdateProperty.ApplicationName].type).toBe('simple');
            expect(schema.properties![CodeDeployLambdaAliasUpdateProperty.DeploymentGroupName].type).toBe('simple');
        });

        it('defines AppStream policies as simple types', () => {
            const stopSchema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.StopBeforeUpdate];
            const startSchema = UPDATE_POLICY_SCHEMA[UpdatePolicyProperty.StartAfterUpdate];

            expect(stopSchema.type).toBe('simple');
            expect(startSchema.type).toBe('simple');
            expect(stopSchema.supportedResourceTypes).toContain('AWS::AppStream::Fleet');
            expect(startSchema.supportedResourceTypes).toContain('AWS::AppStream::Fleet');
        });
    });

    describe('resource type arrays', () => {
        it('UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES contains all six supported types', () => {
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toHaveLength(6);
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::AutoScaling::AutoScalingGroup');
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::ElastiCache::ReplicationGroup');
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::OpenSearchService::Domain');
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::Elasticsearch::Domain');
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::Lambda::Alias');
            expect(UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toContain('AWS::AppStream::Fleet');
        });

        it('AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES contains only AutoScaling', () => {
            expect(AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toEqual(['AWS::AutoScaling::AutoScalingGroup']);
        });

        it('OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES contains both domain types', () => {
            expect(OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES).toEqual([
                'AWS::OpenSearchService::Domain',
                'AWS::Elasticsearch::Domain',
            ]);
        });
    });
});
