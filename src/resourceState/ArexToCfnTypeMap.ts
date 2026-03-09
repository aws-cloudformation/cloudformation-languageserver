/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Auto-generated from holodex-data.json

// Resource Explorer type to CloudFormation type mapping
const arexToCfnTypeMap: Record<string, string> = {
    'access-analyzer:analyzer': 'AWS::AccessAnalyzer::Analyzer',
    'acm-pca:certificate-authority': 'AWS::ACMPCA::CertificateAuthority',
    'acm:certificate': 'AWS::CertificateManager::Certificate',
    'airflow:environment': 'AWS::MWAA::Environment',
    'amplify:apps': 'AWS::Amplify::App',
    'amplify:apps/branches': 'AWS::Amplify::Branch',
    'amplify:apps/domains': 'AWS::Amplify::Domain',
    'aoss:collection': 'AWS::OpenSearchServerless::Collection',
    'apigateway:apis': 'AWS::ApiGatewayV2::Api',
    'apigateway:apis/routes': 'AWS::ApiGatewayV2::Route',
    'apigateway:apis/stages': 'AWS::ApiGateway::Stage',
    'apigateway:restapis': 'AWS::ApiGateway::RestApi',
    'apigateway:restapis/deployments': 'AWS::ApiGateway::Deployment',
    'apigateway:restapis/resources': 'AWS::ApiGateway::Resource',
    'apigateway:restapis/resources/methods': 'AWS::ApiGateway::Method',
    'apigateway:vpclinks': 'AWS::ApiGateway::VpcLink',
    'app-integrations:application': 'AWS::AppIntegrations::Application',
    'app-integrations:event-integration': 'AWS::AppIntegrations::EventIntegration',
    'appconfig:application': 'AWS::AppConfig::Application',
    'appconfig:application/environment': 'AWS::AppConfig::Environment',
    'appconfig:deploymentstrategy': 'AWS::AppConfig::DeploymentStrategy',
    'appconfig:extensionassociation': 'AWS::AppConfig::ExtensionAssociation',
    'appflow:flow': 'AWS::AppFlow::Flow',
    'appmesh:mesh': 'AWS::AppMesh::Mesh',
    'appmesh:mesh/virtualGateway': 'AWS::AppMesh::VirtualGateway',
    'appmesh:mesh/virtualGateway/gatewayRoute': 'AWS::AppMesh::GatewayRoute',
    'appmesh:mesh/virtualNode': 'AWS::AppMesh::VirtualNode',
    'appmesh:mesh/virtualRouter': 'AWS::AppMesh::VirtualRouter',
    'appmesh:mesh/virtualRouter/route': 'AWS::AppMesh::Route',
    'appmesh:mesh/virtualService': 'AWS::AppMesh::VirtualService',
    'apprunner:autoscalingconfiguration': 'AWS::AppRunner::AutoScalingConfiguration',
    'apprunner:service': 'AWS::AppRunner::Service',
    'apprunner:vpcconnector': 'AWS::AppRunner::VpcConnector',
    'appstream:app-block': 'AWS::AppStream::AppBlock',
    'appstream:application': 'AWS::AppStream::Application',
    'appstream:fleet': 'AWS::AppStream::Fleet',
    'appstream:image-builder': 'AWS::AppStream::ImageBuilder',
    'appstream:stack': 'AWS::AppStream::Stack',
    'appsync:apis': 'AWS::AppSync::Api',
    'aps:rulegroupsnamespace': 'AWS::APS::RuleGroupsNamespace',
    'aps:workspace': 'AWS::APS::Workspace',
    'athena:datacatalog': 'AWS::Athena::DataCatalog',
    'athena:workgroup': 'AWS::Athena::WorkGroup',
    'auditmanager:assessment': 'AWS::AuditManager::Assessment',
    'autoscaling:autoScalingGroup': 'AWS::AutoScaling::AutoScalingGroup',
    'backup-gateway:hypervisor': 'AWS::BackupGateway::Hypervisor',
    'backup:backup-plan': 'AWS::Backup::BackupPlan',
    'backup:backup-vault': 'AWS::Backup::LogicallyAirGappedBackupVault',
    'backup:report-plan': 'AWS::Backup::ReportPlan',
    'batch:compute-environment': 'AWS::Batch::ComputeEnvironment',
    'batch:job-definition': 'AWS::Batch::JobDefinition',
    'batch:job-queue': 'AWS::Batch::JobQueue',
    'batch:scheduling-policy': 'AWS::Batch::SchedulingPolicy',
    'bedrock:agent': 'AWS::Bedrock::Agent',
    'bedrock:agent-alias': 'AWS::Bedrock::AgentAlias',
    'bedrock:application-inference-profile': 'AWS::Bedrock::ApplicationInferenceProfile',
    'bedrock:data-automation-project': 'AWS::Bedrock::DataAutomationProject',
    'bedrock:flow': 'AWS::Bedrock::Flow',
    'bedrock:guardrail': 'AWS::Bedrock::Guardrail',
    'bedrock:knowledge-base': 'AWS::Bedrock::KnowledgeBase',
    'bedrock:prompt': 'AWS::Bedrock::Prompt',
    'bedrock:prompt-router': 'AWS::Bedrock::IntelligentPromptRouter',
    'ce:anomalymonitor': 'AWS::CE::AnomalyMonitor',
    'ce:anomalysubscription': 'AWS::CE::AnomalySubscription',
    'cloud9:environment': 'AWS::Cloud9::EnvironmentEC2',
    'cloudformation:stack': 'AWS::CloudFormation::Stack',
    'cloudformation:stackset': 'AWS::CloudFormation::StackSet',
    'cloudfront:cache-policy': 'AWS::CloudFront::CachePolicy',
    'cloudfront:continuous-deployment-policy': 'AWS::CloudFront::ContinuousDeploymentPolicy',
    'cloudfront:distribution': 'AWS::CloudFront::Distribution',
    'cloudfront:function': 'AWS::CloudFront::Function',
    'cloudfront:origin-access-control': 'AWS::CloudFront::OriginAccessControl',
    'cloudfront:origin-access-identity': 'AWS::CloudFront::CloudFrontOriginAccessIdentity',
    'cloudfront:origin-request-policy': 'AWS::CloudFront::OriginRequestPolicy',
    'cloudfront:realtime-log-config': 'AWS::CloudFront::RealtimeLogConfig',
    'cloudfront:response-headers-policy': 'AWS::CloudFront::ResponseHeadersPolicy',
    'cloudtrail:channel': 'AWS::CloudTrail::Channel',
    'cloudtrail:dashboard': 'AWS::CloudTrail::Dashboard',
    'cloudtrail:eventdatastore': 'AWS::CloudTrail::EventDataStore',
    'cloudtrail:trail': 'AWS::CloudTrail::Trail',
    'cloudwatch:alarm': 'AWS::CloudWatch::Alarm',
    'cloudwatch:dashboard': 'AWS::CloudWatch::Dashboard',
    'cloudwatch:insight-rule': 'AWS::CloudWatch::InsightRule',
    'cloudwatch:metric-stream': 'AWS::CloudWatch::MetricStream',
    'codeartifact:domain': 'AWS::CodeArtifact::Domain',
    'codeartifact:repository': 'AWS::CodeArtifact::Repository',
    'codebuild:project': 'AWS::CodeBuild::Project',
    'codecommit:repository': 'AWS::CodeCommit::Repository',
    'codeconnections:connection': 'AWS::CodeConnections::Connection',
    'codedeploy:application': 'AWS::CodeDeploy::Application',
    'codedeploy:deploymentconfig': 'AWS::CodeDeploy::DeploymentConfig',
    'codeguru-profiler:profilingGroup': 'AWS::CodeGuruProfiler::ProfilingGroup',
    'codeguru-reviewer:association': 'AWS::CodeGuruReviewer::RepositoryAssociation',
    'codepipeline:pipeline': 'AWS::CodePipeline::Pipeline',
    'codepipeline:webhook': 'AWS::CodePipeline::Webhook',
    'codestar-connections:connection': 'AWS::CodeStarConnections::Connection',
    'cognito-identity:identitypool': 'AWS::Cognito::IdentityPool',
    'cognito-idp:userpool': 'AWS::Cognito::UserPool',
    'comprehend:document-classifier': 'AWS::Comprehend::DocumentClassifier',
    'comprehend:flywheel': 'AWS::Comprehend::Flywheel',
    'config:config-rule': 'AWS::Config::ConfigRule',
    'connect:instance': 'AWS::Connect::Instance',
    'connect:instance/agent': 'AWS::Connect::User',
    'connect:instance/operating-hours': 'AWS::Connect::HoursOfOperation',
    'connect:instance/rule': 'AWS::Connect::Rule',
    'connect:instance/task-template': 'AWS::Connect::TaskTemplate',
    'connect:instance/transfer-destination': 'AWS::Connect::QuickConnect',
    'connect:phone-number': 'AWS::Connect::PhoneNumber',
    'databrew:dataset': 'AWS::DataBrew::Dataset',
    'databrew:job': 'AWS::DataBrew::Job',
    'databrew:project': 'AWS::DataBrew::Project',
    'databrew:recipe': 'AWS::DataBrew::Recipe',
    'databrew:ruleset': 'AWS::DataBrew::Ruleset',
    'databrew:schedule': 'AWS::DataBrew::Schedule',
    'datapipeline:pipeline': 'AWS::DataPipeline::Pipeline',
    'datasync:location': 'AWS::DataSync::LocationEFS',
    'datasync:task': 'AWS::DataSync::Task',
    'dax:cache': 'AWS::DAX::Cluster',
    'detective:graph': 'AWS::Detective::Graph',
    'devicefarm:instanceprofile': 'AWS::DeviceFarm::InstanceProfile',
    'devicefarm:project': 'AWS::DeviceFarm::Project',
    'devicefarm:testgrid-project': 'AWS::DeviceFarm::TestGridProject',
    'dms:cert': 'AWS::DMS::Certificate',
    'dms:endpoint': 'AWS::DMS::Endpoint',
    'dms:es': 'AWS::DMS::EventSubscription',
    'dms:rep': 'AWS::DMS::ReplicationInstance',
    'dms:subgrp': 'AWS::DMS::ReplicationSubnetGroup',
    'dms:task': 'AWS::DMS::ReplicationTask',
    'ds:directory': 'AWS::DirectoryService::MicrosoftAD',
    'dynamodb:table': 'AWS::DynamoDB::Table',
    'ec2:capacity-reservation': 'AWS::EC2::CapacityReservation',
    'ec2:capacity-reservation-fleet': 'AWS::EC2::CapacityReservationFleet',
    'ec2:carrier-gateway': 'AWS::EC2::CarrierGateway',
    'ec2:client-vpn-endpoint': 'AWS::EC2::ClientVpnEndpoint',
    'ec2:customer-gateway': 'AWS::EC2::CustomerGateway',
    'ec2:dedicated-host': 'AWS::EC2::Host',
    'ec2:dhcp-options': 'AWS::EC2::DHCPOptions',
    'ec2:egress-only-internet-gateway': 'AWS::EC2::EgressOnlyInternetGateway',
    'ec2:elastic-ip': 'AWS::EC2::EIP',
    'ec2:fleet': 'AWS::EC2::EC2Fleet',
    'ec2:instance': 'AWS::EC2::Instance',
    'ec2:internet-gateway': 'AWS::EC2::InternetGateway',
    'ec2:ipam': 'AWS::EC2::IPAM',
    'ec2:ipam-pool': 'AWS::EC2::IPAMPool',
    'ec2:ipam-resource-discovery': 'AWS::EC2::IPAMResourceDiscovery',
    'ec2:ipam-resource-discovery-association': 'AWS::EC2::IPAMResourceDiscoveryAssociation',
    'ec2:ipam-scope': 'AWS::EC2::IPAMScope',
    'ec2:key-pair': 'AWS::EC2::KeyPair',
    'ec2:launch-template': 'AWS::EC2::LaunchTemplate',
    'ec2:natgateway': 'AWS::EC2::NatGateway',
    'ec2:network-acl': 'AWS::EC2::NetworkAcl',
    'ec2:network-insights-access-scope': 'AWS::EC2::NetworkInsightsAccessScope',
    'ec2:network-insights-access-scope-analysis': 'AWS::EC2::NetworkInsightsAccessScopeAnalysis',
    'ec2:network-insights-analysis': 'AWS::EC2::NetworkInsightsAnalysis',
    'ec2:network-insights-path': 'AWS::EC2::NetworkInsightsPath',
    'ec2:network-interface': 'AWS::EC2::NetworkInterface',
    'ec2:placement-group': 'AWS::EC2::PlacementGroup',
    'ec2:prefix-list': 'AWS::EC2::PrefixList',
    'ec2:route-table': 'AWS::EC2::RouteTable',
    'ec2:security-group': 'AWS::EC2::SecurityGroup',
    'ec2:security-group-rule': 'AWS::EC2::SecurityGroupEgress',
    'ec2:spot-fleet-request': 'AWS::EC2::SpotFleet',
    'ec2:subnet': 'AWS::EC2::Subnet',
    'ec2:traffic-mirror-filter': 'AWS::EC2::TrafficMirrorFilter',
    'ec2:traffic-mirror-filter-rule': 'AWS::EC2::TrafficMirrorFilterRule',
    'ec2:traffic-mirror-session': 'AWS::EC2::TrafficMirrorSession',
    'ec2:traffic-mirror-target': 'AWS::EC2::TrafficMirrorTarget',
    'ec2:transit-gateway': 'AWS::EC2::TransitGateway',
    'ec2:transit-gateway-attachment': 'AWS::EC2::TransitGatewayAttachment',
    'ec2:transit-gateway-connect-peer': 'AWS::EC2::TransitGatewayConnectPeer',
    'ec2:transit-gateway-multicast-domain': 'AWS::EC2::TransitGatewayMulticastDomain',
    'ec2:transit-gateway-route-table': 'AWS::EC2::TransitGatewayRouteTable',
    'ec2:verified-access-endpoint': 'AWS::EC2::VerifiedAccessEndpoint',
    'ec2:verified-access-group': 'AWS::EC2::VerifiedAccessGroup',
    'ec2:verified-access-instance': 'AWS::EC2::VerifiedAccessInstance',
    'ec2:verified-access-trust-provider': 'AWS::EC2::VerifiedAccessTrustProvider',
    'ec2:volume': 'AWS::EC2::Volume',
    'ec2:vpc': 'AWS::EC2::VPC',
    'ec2:vpc-endpoint': 'AWS::EC2::VPCEndpoint',
    'ec2:vpc-flow-log': 'AWS::EC2::FlowLog',
    'ec2:vpc-peering-connection': 'AWS::EC2::VPCPeeringConnection',
    'ec2:vpn-connection': 'AWS::EC2::VPNConnection',
    'ec2:vpn-gateway': 'AWS::EC2::VPNGateway',
    'ecr-public:repository': 'AWS::ECR::PublicRepository',
    'ecr:repository': 'AWS::ECR::Repository',
    'ecs:capacity-provider': 'AWS::ECS::CapacityProvider',
    'ecs:cluster': 'AWS::ECS::Cluster',
    'ecs:service': 'AWS::ECS::Service',
    'ecs:task-definition': 'AWS::ECS::TaskDefinition',
    'ecs:task-set': 'AWS::ECS::TaskSet',
    'eks:cluster': 'AWS::EKS::Cluster',
    'eks:podidentityassociation': 'AWS::EKS::PodIdentityAssociation',
    'elasticache:cluster': 'AWS::ElastiCache::CacheCluster',
    'elasticache:globalreplicationgroup': 'AWS::ElastiCache::GlobalReplicationGroup',
    'elasticache:parametergroup': 'AWS::ElastiCache::ParameterGroup',
    'elasticache:replicationgroup': 'AWS::ElastiCache::ReplicationGroup',
    'elasticache:subnetgroup': 'AWS::ElastiCache::SubnetGroup',
    'elasticache:user': 'AWS::ElastiCache::User',
    'elasticache:usergroup': 'AWS::ElastiCache::UserGroup',
    'elasticbeanstalk:application': 'AWS::ElasticBeanstalk::Application',
    'elasticbeanstalk:applicationversion': 'AWS::ElasticBeanstalk::ApplicationVersion',
    'elasticbeanstalk:configurationtemplate': 'AWS::ElasticBeanstalk::ConfigurationTemplate',
    'elasticbeanstalk:environment': 'AWS::ElasticBeanstalk::Environment',
    'elasticfilesystem:access-point': 'AWS::EFS::AccessPoint',
    'elasticfilesystem:file-system': 'AWS::EFS::FileSystem',
    'elasticloadbalancing:listener-rule/app': 'AWS::ElasticLoadBalancingV2::ListenerRule',
    'elasticloadbalancing:listener/net': 'AWS::ElasticLoadBalancingV2::Listener',
    'elasticloadbalancing:loadbalancer': 'AWS::ElasticLoadBalancing::LoadBalancer',
    'elasticloadbalancing:loadbalancer/app': 'AWS::ElasticLoadBalancingV2::LoadBalancer',
    'elasticloadbalancing:targetgroup': 'AWS::ElasticLoadBalancingV2::TargetGroup',
    'elasticmapreduce:cluster': 'AWS::EMR::Cluster',
    'emr-containers:securityconfigurations': 'AWS::EMRContainers::SecurityConfiguration',
    'emr-containers:virtualclusters': 'AWS::EMRContainers::VirtualCluster',
    'emr-containers:virtualclusters/endpoints': 'AWS::EMRContainers::Endpoint',
    'emr-serverless:applications': 'AWS::EMRServerless::Application',
    'es:domain': 'AWS::OpenSearchService::Domain',
    'events:api-destination': 'AWS::Events::ApiDestination',
    'events:archive': 'AWS::Events::Archive',
    'events:connection': 'AWS::Events::Connection',
    'events:endpoint': 'AWS::Events::Endpoint',
    'events:event-bus': 'AWS::Events::EventBus',
    'events:rule': 'AWS::Events::Rule',
    'finspace:environment': 'AWS::FinSpace::Environment',
    'firehose:deliverystream': 'AWS::KinesisFirehose::DeliveryStream',
    'fis:experiment-template': 'AWS::FIS::ExperimentTemplate',
    'forecast:dataset': 'AWS::Forecast::Dataset',
    'forecast:dataset-group': 'AWS::Forecast::DatasetGroup',
    'frauddetector:detector': 'AWS::FraudDetector::Detector',
    'frauddetector:entity-type': 'AWS::FraudDetector::EntityType',
    'frauddetector:event-type': 'AWS::FraudDetector::EventType',
    'frauddetector:label': 'AWS::FraudDetector::Label',
    'frauddetector:outcome': 'AWS::FraudDetector::Outcome',
    'frauddetector:variable': 'AWS::FraudDetector::Variable',
    'fsx:file-system': 'AWS::FSx::FileSystem',
    'gamelift:alias': 'AWS::GameLift::Alias',
    'gamelift:build': 'AWS::GameLift::Build',
    'gamelift:gamesessionqueue': 'AWS::GameLift::GameSessionQueue',
    'gamelift:location': 'AWS::GameLift::Location',
    'gamelift:matchmakingconfiguration': 'AWS::GameLift::MatchmakingConfiguration',
    'gamelift:matchmakingruleset': 'AWS::GameLift::MatchmakingRuleSet',
    'gamelift:script': 'AWS::GameLift::Script',
    'globalaccelerator:accelerator': 'AWS::GlobalAccelerator::Accelerator',
    'globalaccelerator:accelerator/listener': 'AWS::GlobalAccelerator::Listener',
    'globalaccelerator:accelerator/listener/endpoint-group': 'AWS::GlobalAccelerator::EndpointGroup',
    'glue:crawler': 'AWS::Glue::Crawler',
    'glue:dataQualityRuleset': 'AWS::Glue::DataQualityRuleset',
    'glue:database': 'AWS::Glue::Database',
    'glue:job': 'AWS::Glue::Job',
    'glue:mlTransform': 'AWS::Glue::MLTransform',
    'glue:registry': 'AWS::Glue::Registry',
    'glue:table': 'AWS::Glue::Table',
    'glue:trigger': 'AWS::Glue::Trigger',
    'grafana:workspaces': 'AWS::Grafana::Workspace',
    'greengrass:components:versions': 'AWS::GreengrassV2::ComponentVersion',
    'greengrass:connectorsDefinition': 'AWS::Greengrass::ConnectorDefinition',
    'greengrass:coresDefinition': 'AWS::Greengrass::CoreDefinition',
    'greengrass:devicesDefinition': 'AWS::Greengrass::DeviceDefinition',
    'greengrass:functionsDefinition': 'AWS::Greengrass::FunctionDefinition',
    'greengrass:groups': 'AWS::Greengrass::Group',
    'greengrass:loggersDefinition': 'AWS::Greengrass::LoggerDefinition',
    'greengrass:resourcesDefinition': 'AWS::Greengrass::ResourceDefinition',
    'greengrass:subscriptionsDefinition': 'AWS::Greengrass::SubscriptionDefinition',
    'groundstation:config': 'AWS::GroundStation::Config',
    'groundstation:dataflow-endpoint-group': 'AWS::GroundStation::DataflowEndpointGroup',
    'groundstation:mission-profile': 'AWS::GroundStation::MissionProfile',
    'guardduty:detector': 'AWS::GuardDuty::Detector',
    'guardduty:detector/filter': 'AWS::GuardDuty::Filter',
    'guardduty:detector/ipset': 'AWS::GuardDuty::IPSet',
    'guardduty:detector/publishingDestination': 'AWS::GuardDuty::PublishingDestination',
    'guardduty:detector/threatintelset': 'AWS::GuardDuty::ThreatIntelSet',
    'guardduty:malware-protection-plan': 'AWS::GuardDuty::MalwareProtectionPlan',
    'healthlake:datastore/fhir': 'AWS::HealthLake::FHIRDatastore',
    'iam:group': 'AWS::IAM::Group',
    'iam:instance-profile': 'AWS::IAM::InstanceProfile',
    'iam:mfa': 'AWS::IAM::VirtualMFADevice',
    'iam:oidc-provider': 'AWS::IAM::OIDCProvider',
    'iam:policy': 'AWS::IAM::Policy',
    'iam:role': 'AWS::IAM::Role',
    'iam:saml-provider': 'AWS::IAM::SAMLProvider',
    'iam:server-certificate': 'AWS::IAM::ServerCertificate',
    'iam:user': 'AWS::IAM::User',
    'imagebuilder:component': 'AWS::ImageBuilder::Component',
    'imagebuilder:container-recipe': 'AWS::ImageBuilder::ContainerRecipe',
    'imagebuilder:distribution-configuration': 'AWS::ImageBuilder::DistributionConfiguration',
    'imagebuilder:image': 'AWS::ImageBuilder::Image',
    'imagebuilder:image-pipeline': 'AWS::ImageBuilder::ImagePipeline',
    'imagebuilder:image-recipe': 'AWS::ImageBuilder::ImageRecipe',
    'imagebuilder:infrastructure-configuration': 'AWS::ImageBuilder::InfrastructureConfiguration',
    'inspector2:filter': 'AWS::InspectorV2::Filter',
    'inspector:target/template': 'AWS::Inspector::AssessmentTemplate',
    'iot:authorizer': 'AWS::IoT::Authorizer',
    'iot:billinggroup': 'AWS::IoT::BillingGroup',
    'iot:cacert': 'AWS::IoT::CACertificate',
    'iot:cert': 'AWS::IoT::Certificate',
    'iot:fleetmetric': 'AWS::IoT::FleetMetric',
    'iot:jobtemplate': 'AWS::IoT::JobTemplate',
    'iot:mitigationaction': 'AWS::IoT::MitigationAction',
    'iot:policy': 'AWS::IoT::Policy',
    'iot:provisioningtemplate': 'AWS::IoT::ProvisioningTemplate',
    'iot:rolealias': 'AWS::IoT::RoleAlias',
    'iot:rule': 'AWS::IoT::TopicRule',
    'iot:ruledestination': 'AWS::IoT::TopicRuleDestination',
    'iot:scheduledaudit': 'AWS::IoT::ScheduledAudit',
    'iot:securityprofile': 'AWS::IoT::SecurityProfile',
    'iot:thing': 'AWS::IoT::Thing',
    'iot:thinggroup': 'AWS::IoT::ThingGroup',
    'iot:thingtype': 'AWS::IoT::ThingType',
    'iotdeviceadvisor:suitedefinition': 'AWS::IoTCoreDeviceAdvisor::SuiteDefinition',
    'iotevents:alarmModel': 'AWS::IoTEvents::AlarmModel',
    'iotevents:detectorModel': 'AWS::IoTEvents::DetectorModel',
    'iotevents:input': 'AWS::IoTEvents::Input',
    'iotfleetwise:decoder-manifest': 'AWS::IoTFleetWise::DecoderManifest',
    'iotfleetwise:model-manifest': 'AWS::IoTFleetWise::ModelManifest',
    'iotfleetwise:signal-catalog': 'AWS::IoTFleetWise::SignalCatalog',
    'iotfleetwise:vehicle': 'AWS::IoTFleetWise::Vehicle',
    'iotsitewise:access-policy': 'AWS::IoTSiteWise::AccessPolicy',
    'iotsitewise:asset': 'AWS::IoTSiteWise::Asset',
    'iotsitewise:asset-model': 'AWS::IoTSiteWise::AssetModel',
    'iotsitewise:dashboard': 'AWS::IoTSiteWise::Dashboard',
    'iotsitewise:gateway': 'AWS::IoTSiteWise::Gateway',
    'iotsitewise:portal': 'AWS::IoTSiteWise::Portal',
    'iotsitewise:project': 'AWS::IoTSiteWise::Project',
    'iottwinmaker:workspace': 'AWS::IoTTwinMaker::Workspace',
    'iottwinmaker:workspace/component-type': 'AWS::IoTTwinMaker::ComponentType',
    'iottwinmaker:workspace/entity': 'AWS::IoTTwinMaker::Entity',
    'iottwinmaker:workspace/sync-job': 'AWS::IoTTwinMaker::SyncJob',
    'iotwireless:Destination': 'AWS::IoTWireless::Destination',
    'iotwireless:DeviceProfile': 'AWS::IoTWireless::DeviceProfile',
    'iotwireless:FuotaTask': 'AWS::IoTWireless::FuotaTask',
    'iotwireless:MulticastGroup': 'AWS::IoTWireless::MulticastGroup',
    'iotwireless:ServiceProfile': 'AWS::IoTWireless::ServiceProfile',
    'iotwireless:SidewalkAccount': 'AWS::IoTWireless::PartnerAccount',
    'iotwireless:WirelessDevice': 'AWS::IoTWireless::WirelessDevice',
    'iotwireless:WirelessGateway': 'AWS::IoTWireless::WirelessGateway',
    'iotwireless:WirelessGatewayTaskDefinition': 'AWS::IoTWireless::TaskDefinition',
    'ivs:channel': 'AWS::IVS::Channel',
    'ivs:encoder-configuration': 'AWS::IVS::EncoderConfiguration',
    'ivs:ingest-configuration': 'AWS::IVS::IngestConfiguration',
    'ivs:playback-key': 'AWS::IVS::PlaybackKeyPair',
    'ivs:playback-restriction-policy': 'AWS::IVS::PlaybackRestrictionPolicy',
    'ivs:recording-configuration': 'AWS::IVS::RecordingConfiguration',
    'ivs:storage-configuration': 'AWS::IVS::StorageConfiguration',
    'ivs:stream-key': 'AWS::IVS::StreamKey',
    'ivschat:logging-configuration': 'AWS::IVSChat::LoggingConfiguration',
    'ivschat:room': 'AWS::IVSChat::Room',
    'kafka:cluster': 'AWS::MSK::Cluster',
    'kafka:configuration': 'AWS::MSK::Configuration',
    'kendra:index': 'AWS::Kendra::Index',
    'kendra:index/data-source': 'AWS::Kendra::DataSource',
    'kendra:index/faq': 'AWS::Kendra::Faq',
    'kinesis:stream': 'AWS::Kinesis::Stream',
    'kinesisanalytics:application': 'AWS::KinesisAnalytics::Application',
    'kinesisvideo:channel': 'AWS::KinesisVideo::SignalingChannel',
    'kinesisvideo:stream': 'AWS::KinesisVideo::Stream',
    'kms:key': 'AWS::KMS::Key',
    'lambda:code-signing-config': 'AWS::Lambda::CodeSigningConfig',
    'lambda:event-source-mapping': 'AWS::Lambda::EventSourceMapping',
    'lambda:function': 'AWS::Lambda::Function',
    'lex:bot': 'AWS::Lex::Bot',
    'lex:bot-alias': 'AWS::Lex::BotAlias',
    'license-manager:grant': 'AWS::LicenseManager::Grant',
    'logs:destination': 'AWS::Logs::Destination',
    'logs:log-group': 'AWS::Logs::LogGroup',
    'm2:env': 'AWS::M2::Environment',
    'macie2:allow-list': 'AWS::Macie::AllowList',
    'macie2:custom-data-identifier': 'AWS::Macie::CustomDataIdentifier',
    'macie2:findings-filter': 'AWS::Macie::FindingsFilter',
    'managedblockchain:accessors': 'AWS::ManagedBlockchain::Accessor',
    'mediapackage-vod:assets': 'AWS::MediaPackage::Asset',
    'mediapackage-vod:packaging-configurations': 'AWS::MediaPackage::PackagingConfiguration',
    'mediapackage-vod:packaging-groups': 'AWS::MediaPackage::PackagingGroup',
    'mediapackage:channels': 'AWS::MediaPackage::Channel',
    'mediapackage:origin_endpoints': 'AWS::MediaPackage::OriginEndpoint',
    'mediastore:container': 'AWS::MediaStore::Container',
    'mediatailor:channel': 'AWS::MediaTailor::Channel',
    'mediatailor:liveSource': 'AWS::MediaTailor::LiveSource',
    'mediatailor:playbackConfiguration': 'AWS::MediaTailor::PlaybackConfiguration',
    'mediatailor:vodSource': 'AWS::MediaTailor::VodSource',
    'memorydb:acl': 'AWS::MemoryDB::ACL',
    'memorydb:cluster': 'AWS::MemoryDB::Cluster',
    'memorydb:parametergroup': 'AWS::MemoryDB::ParameterGroup',
    'memorydb:subnetgroup': 'AWS::MemoryDB::SubnetGroup',
    'memorydb:user': 'AWS::MemoryDB::User',
    'mobiletargeting:apps/campaigns': 'AWS::Pinpoint::Campaign',
    'mobiletargeting:apps/segments': 'AWS::Pinpoint::Segment',
    'mobiletargeting:templates/EMAIL': 'AWS::Pinpoint::EmailTemplate',
    'mobiletargeting:templates/PUSH': 'AWS::Pinpoint::PushTemplate',
    'mobiletargeting:templates/SMS': 'AWS::Pinpoint::SmsTemplate',
    'mq:broker': 'AWS::AmazonMQ::Broker',
    'mq:configuration': 'AWS::AmazonMQ::Configuration',
    'network-firewall:firewall': 'AWS::NetworkFirewall::Firewall',
    'network-firewall:firewall-policy': 'AWS::NetworkFirewall::FirewallPolicy',
    'network-firewall:stateful-rulegroup': 'AWS::NetworkFirewall::RuleGroup',
    'network-firewall:stateless-rulegroup': 'AWS::NetworkFirewall::RuleGroup',
    'networkmanager:attachment': 'AWS::NetworkManager::ConnectAttachment',
    'networkmanager:core-network': 'AWS::NetworkManager::CoreNetwork',
    'networkmanager:device': 'AWS::NetworkManager::Device',
    'networkmanager:global-network': 'AWS::NetworkManager::GlobalNetwork',
    'networkmanager:link': 'AWS::NetworkManager::Link',
    'oam:sink': 'AWS::Oam::Sink',
    'omics:referenceStore': 'AWS::Omics::ReferenceStore',
    'omics:runGroup': 'AWS::Omics::RunGroup',
    'omics:workflow': 'AWS::Omics::Workflow',
    'panorama:package': 'AWS::Panorama::Package',
    'personalize:dataset': 'AWS::Personalize::Dataset',
    'personalize:dataset-group': 'AWS::Personalize::DatasetGroup',
    'personalize:schema': 'AWS::Personalize::Schema',
    'personalize:solution': 'AWS::Personalize::Solution',
    'pipes:pipe': 'AWS::Pipes::Pipe',
    'profile:domains': 'AWS::CustomerProfiles::Domain',
    'profile:domains/integrations': 'AWS::CustomerProfiles::Integration',
    'profile:domains/object-types': 'AWS::CustomerProfiles::ObjectType',
    'proton:environment-account-connection': 'AWS::Proton::EnvironmentAccountConnection',
    'proton:environment-template': 'AWS::Proton::EnvironmentTemplate',
    'proton:service-template': 'AWS::Proton::ServiceTemplate',
    'quicksight:dataset': 'AWS::QuickSight::DataSet',
    'quicksight:datasource': 'AWS::QuickSight::DataSource',
    'quicksight:template': 'AWS::QuickSight::Template',
    'quicksight:theme': 'AWS::QuickSight::Theme',
    'ram:resource-share': 'AWS::RAM::ResourceShare',
    'rds:cev': 'AWS::RDS::CustomDBEngineVersion',
    'rds:cluster': 'AWS::DocDB::DBCluster',
    'rds:cluster-pg': 'AWS::Neptune::DBClusterParameterGroup',
    'rds:db': 'AWS::DocDB::DBInstance',
    'rds:db-proxy': 'AWS::RDS::DBProxy',
    'rds:db-proxy-endpoint': 'AWS::RDS::DBProxyEndpoint',
    'rds:es': 'AWS::DocDB::EventSubscription',
    'rds:global-cluster': 'AWS::RDS::GlobalCluster',
    'rds:og': 'AWS::RDS::OptionGroup',
    'rds:pg': 'AWS::Neptune::DBParameterGroup',
    'rds:secgrp': 'AWS::RDS::DBSecurityGroup',
    'rds:subgrp': 'AWS::Neptune::DBSubnetGroup',
    'redshift:cluster': 'AWS::Redshift::Cluster',
    'redshift:eventsubscription': 'AWS::Redshift::EventSubscription',
    'redshift:parametergroup': 'AWS::Redshift::ClusterParameterGroup',
    'redshift:subnetgroup': 'AWS::Redshift::ClusterSubnetGroup',
    'refactor-spaces:environment': 'AWS::RefactorSpaces::Environment',
    'refactor-spaces:environment/application': 'AWS::RefactorSpaces::Application',
    'refactor-spaces:environment/application/route': 'AWS::RefactorSpaces::Route',
    'refactor-spaces:environment/application/service': 'AWS::RefactorSpaces::Service',
    'rekognition:project': 'AWS::Rekognition::Project',
    'resiliencehub:app': 'AWS::ResilienceHub::App',
    'resiliencehub:resiliency-policy': 'AWS::ResilienceHub::ResiliencyPolicy',
    'resource-explorer-2:index': 'AWS::ResourceExplorer2::Index',
    'resource-explorer-2:view': 'AWS::ResourceExplorer2::View',
    'resource-groups:group': 'AWS::ResourceGroups::Group',
    'route53-recovery-control:cluster': 'AWS::Route53RecoveryControl::Cluster',
    'route53-recovery-control:controlpanel/routingcontrol': 'AWS::Route53RecoveryControl::RoutingControl',
    'route53-recovery-control:controlpanel/safetyrule': 'AWS::Route53RecoveryControl::SafetyRule',
    'route53-recovery-readiness:cell': 'AWS::Route53RecoveryReadiness::Cell',
    'route53-recovery-readiness:readiness-check': 'AWS::Route53RecoveryReadiness::ReadinessCheck',
    'route53-recovery-readiness:recovery-group': 'AWS::Route53RecoveryReadiness::RecoveryGroup',
    'route53-recovery-readiness:resource-set': 'AWS::Route53RecoveryReadiness::ResourceSet',
    'route53:healthcheck': 'AWS::Route53::HealthCheck',
    'route53:hostedzone': 'AWS::Route53::HostedZone',
    'route53resolver:firewall-domain-list': 'AWS::Route53Resolver::FirewallDomainList',
    'route53resolver:firewall-rule-group': 'AWS::Route53Resolver::FirewallRuleGroup',
    'route53resolver:firewall-rule-group-association': 'AWS::Route53Resolver::FirewallRuleGroupAssociation',
    'route53resolver:resolver-endpoint': 'AWS::Route53Resolver::ResolverEndpoint',
    'route53resolver:resolver-query-log-config': 'AWS::Route53Resolver::ResolverQueryLoggingConfig',
    'route53resolver:resolver-rule': 'AWS::Route53Resolver::ResolverRule',
    'rum:appmonitor': 'AWS::RUM::AppMonitor',
    's3:accesspoint': 'AWS::S3::AccessPoint',
    's3:bucket': 'AWS::S3::Bucket',
    's3:multiregionaccesspoint': 'AWS::S3::MultiRegionAccessPoint',
    's3:storage-lens': 'AWS::S3::StorageLens',
    's3:storage-lens-group': 'AWS::S3::StorageLensGroup',
    's3express:bucket': 'AWS::S3Express::DirectoryBucket',
    'sagemaker:app': 'AWS::SageMaker::App',
    'sagemaker:app-image-config': 'AWS::SageMaker::AppImageConfig',
    'sagemaker:cluster': 'AWS::SageMaker::Cluster',
    'sagemaker:code-repository': 'AWS::SageMaker::CodeRepository',
    'sagemaker:domain': 'AWS::SageMaker::Domain',
    'sagemaker:endpoint': 'AWS::SageMaker::Endpoint',
    'sagemaker:endpoint-config': 'AWS::SageMaker::EndpointConfig',
    'sagemaker:feature-group': 'AWS::SageMaker::FeatureGroup',
    'sagemaker:image': 'AWS::SageMaker::Image',
    'sagemaker:image-version': 'AWS::SageMaker::ImageVersion',
    'sagemaker:inference-component': 'AWS::SageMaker::InferenceComponent',
    'sagemaker:inference-experiment': 'AWS::SageMaker::InferenceExperiment',
    'sagemaker:mlflow-tracking-server': 'AWS::SageMaker::MlflowTrackingServer',
    'sagemaker:model': 'AWS::SageMaker::Model',
    'sagemaker:model-card': 'AWS::SageMaker::ModelCard',
    'sagemaker:model-package': 'AWS::SageMaker::ModelPackage',
    'sagemaker:model-package-group': 'AWS::SageMaker::ModelPackageGroup',
    'sagemaker:monitoring-schedule': 'AWS::SageMaker::MonitoringSchedule',
    'sagemaker:notebook-instance': 'AWS::SageMaker::NotebookInstance',
    'sagemaker:notebook-instance-lifecycle-config': 'AWS::SageMaker::NotebookInstanceLifecycleConfig',
    'sagemaker:pipeline': 'AWS::SageMaker::Pipeline',
    'sagemaker:project': 'AWS::SageMaker::Project',
    'sagemaker:space': 'AWS::SageMaker::Space',
    'sagemaker:studio-lifecycle-config': 'AWS::SageMaker::StudioLifecycleConfig',
    'sagemaker:user-profile': 'AWS::SageMaker::UserProfile',
    'sagemaker:workteam': 'AWS::SageMaker::Workteam',
    'scheduler:schedule-group': 'AWS::Scheduler::ScheduleGroup',
    'schemas:discoverer': 'AWS::EventSchemas::Discoverer',
    'secretsmanager:secret': 'AWS::SecretsManager::Secret',
    'servicecatalog:applications': 'AWS::ServiceCatalogAppRegistry::Application',
    'servicecatalog:attribute-groups': 'AWS::ServiceCatalogAppRegistry::AttributeGroup',
    'servicediscovery:service': 'AWS::ServiceDiscovery::Service',
    'ses:configuration-set': 'AWS::PinpointEmail::ConfigurationSet',
    'ses:contact-list': 'AWS::SES::ContactList',
    'ses:dedicated-ip-pool': 'AWS::PinpointEmail::DedicatedIpPool',
    'ses:identity': 'AWS::SES::EmailIdentity',
    'shield:protection': 'AWS::Shield::Protection',
    'shield:protection-group': 'AWS::Shield::ProtectionGroup',
    'signer:signing-profiles': 'AWS::Signer::SigningProfile',
    'sns:topic': 'AWS::SNS::Topic',
    'sqs:queue': 'AWS::SQS::Queue',
    'ssm-incidents:response-plan': 'AWS::SSMIncidents::ResponsePlan',
    'ssm:association': 'AWS::SSM::Association',
    'ssm:document': 'AWS::SSM::Document',
    'ssm:maintenancewindow': 'AWS::SSM::MaintenanceWindow',
    'ssm:parameter': 'AWS::SSM::Parameter',
    'ssm:resource-data-sync': 'AWS::SSM::ResourceDataSync',
    'ssm:windowtarget': 'AWS::SSM::MaintenanceWindowTarget',
    'ssm:windowtask': 'AWS::SSM::MaintenanceWindowTask',
    'states:activity': 'AWS::StepFunctions::Activity',
    'states:stateMachine': 'AWS::StepFunctions::StateMachine',
    'synthetics:canary': 'AWS::Synthetics::Canary',
    'synthetics:group': 'AWS::Synthetics::Group',
    'transfer:agreement': 'AWS::Transfer::Agreement',
    'transfer:certificate': 'AWS::Transfer::Certificate',
    'transfer:connector': 'AWS::Transfer::Connector',
    'transfer:profile': 'AWS::Transfer::Profile',
    'transfer:server': 'AWS::Transfer::Server',
    'transfer:user': 'AWS::Transfer::User',
    'transfer:workflow': 'AWS::Transfer::Workflow',
    'verifiedpermissions:policy-store': 'AWS::VerifiedPermissions::PolicyStore',
    'vpc-lattice:service': 'AWS::VpcLattice::Service',
    'vpc-lattice:service/listener': 'AWS::VpcLattice::Listener',
    'vpc-lattice:servicenetwork': 'AWS::VpcLattice::ServiceNetwork',
    'vpc-lattice:servicenetworkserviceassociation': 'AWS::VpcLattice::ServiceNetworkServiceAssociation',
    'vpc-lattice:targetgroup': 'AWS::VpcLattice::TargetGroup',
    'wafv2:ipset': 'AWS::WAFv2::IPSet',
    'wafv2:regexpatternset': 'AWS::WAFv2::RegexPatternSet',
    'wafv2:rulegroup': 'AWS::WAFv2::RuleGroup',
    'wafv2:webacl': 'AWS::WAFv2::WebACL',
    'wisdom:assistant': 'AWS::Wisdom::Assistant',
    'wisdom:association': 'AWS::Wisdom::AssistantAssociation',
    'wisdom:knowledge-base': 'AWS::Wisdom::KnowledgeBase',
    'workspaces-web:portal': 'AWS::WorkSpacesWeb::Portal',
    'workspaces:connectionalias': 'AWS::WorkSpaces::ConnectionAlias',
    'workspaces:workspace': 'AWS::WorkSpaces::Workspace',
};

// ARN metadata for extracting identifiers
interface ArnMetadata {
    arnRegex: string;
    captureGroups: string[];
}

const arnMetadataMap: Record<string, ArnMetadata> = {
    'AWS::ACMPCA::CertificateAuthority': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):acm-pca:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificate-authority/(?<CertificateAuthorityId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateAuthorityId'],
    },
    'AWS::AIOps::InvestigationGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aiops:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):investigation-group/(?<InvestigationGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'InvestigationGroupId'],
    },
    'AWS::APS::AnomalyDetector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):anomalydetector/(?<WorkspaceId>[^:/]+)/(?<AnomalyDetectorId>[^:/]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'AnomalyDetectorId'],
    },
    'AWS::APS::RuleGroupsNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rulegroupsnamespace/(?<WorkspaceId>[^/:]+)/(?<Namespace>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'Namespace'],
    },
    'AWS::APS::Scraper': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):scraper/(?<ScraperId>[^:/]+)',
        captureGroups: ['AccountId', 'ScraperId'],
    },
    'AWS::APS::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId'],
    },
    'AWS::ARCRegionSwitch::Plan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):arc-region-switch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):plan/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::AccessAnalyzer::Analyzer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):access-analyzer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):analyzer/(?<AnalyzerName>[^/:]+)',
        captureGroups: ['AccountId', 'AnalyzerName'],
    },
    'AWS::AmazonMQ::Broker': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mq:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):broker:(?<BrokerName>[^/:]+):(?<BrokerId>[^/:]+)',
        captureGroups: ['AccountId', 'BrokerName', 'BrokerId'],
    },
    'AWS::AmazonMQ::Configuration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mq:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration:(?<ConfigurationId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigurationId'],
    },
    'AWS::Amplify::App': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplify:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):apps/(?<AppId>d[a-z0-9]+)',
        captureGroups: ['Account', 'AppId'],
    },
    'AWS::Amplify::Branch': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplify:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^:/]+)/branches/(?<BranchName>[^:/]+)',
        captureGroups: ['AccountId', 'AppId', 'BranchName'],
    },
    'AWS::Amplify::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplify:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^:/]+)/domains/(?<DomainName>[^:/]+)',
        captureGroups: ['AccountId', 'AppId', 'DomainName'],
    },
    'AWS::AmplifyUIBuilder::Component': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplifyuibuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app/(?<AppId>[^:/]+)/environment/(?<EnvironmentName>[^:/]+)/components/(?<Id>[^:/]+)',
        captureGroups: ['AccountId', 'AppId', 'EnvironmentName', 'Id'],
    },
    'AWS::AmplifyUIBuilder::Form': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplifyuibuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app/(?<AppId>[^:/]+)/environment/(?<EnvironmentName>[^:/]+)/forms/(?<Id>[^:/]+)',
        captureGroups: ['AccountId', 'AppId', 'EnvironmentName', 'Id'],
    },
    'AWS::AmplifyUIBuilder::Theme': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):amplifyuibuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app/(?<AppId>[^:/]+)/environment/(?<EnvironmentName>[^:/]+)/themes/(?<Id>[^:/]+)',
        captureGroups: ['AccountId', 'AppId', 'EnvironmentName', 'Id'],
    },
    'AWS::ApiGateway::Account': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/account/(?<ApiGatewayAccountId>[^/:]+)',
        captureGroups: ['ApiGatewayAccountId'],
    },
    'AWS::ApiGateway::ApiKey': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apikeys/(?<ApiKeyId>[^/:]+)',
        captureGroups: ['ApiKeyId'],
    },
    'AWS::ApiGateway::Authorizer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/authorizers/(?<AuthorizerId>[^/:]+)',
        captureGroups: ['RestApiId', 'AuthorizerId'],
    },
    'AWS::ApiGateway::BasePathMapping': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/domainnames/(?<DomainName>[^/:]+)/basepathmappings/(?<BasePath>[^/:]+)',
        captureGroups: ['DomainName', 'BasePath'],
    },
    'AWS::ApiGateway::ClientCertificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/clientcertificates/(?<ClientCertificateId>[^/:]+)',
        captureGroups: ['ClientCertificateId'],
    },
    'AWS::ApiGateway::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/deployments/(?<DeploymentId>[^/:]+)',
        captureGroups: ['RestApiId', 'DeploymentId'],
    },
    'AWS::ApiGateway::DocumentationPart': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/documentation/parts/(?<DocumentationPartId>[^/:]+)',
        captureGroups: ['RestApiId', 'DocumentationPartId'],
    },
    'AWS::ApiGateway::DocumentationVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/documentation/versions/(?<DocumentationVersionId>[^/:]+)',
        captureGroups: ['RestApiId', 'DocumentationVersionId'],
    },
    'AWS::ApiGateway::DomainName': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/domainnames/(?<DomainName>[^/:]+)',
        captureGroups: ['DomainName'],
    },
    'AWS::ApiGateway::DomainNameAccessAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/domainnameaccessassociations',
        captureGroups: ['AccountId'],
    },
    'AWS::ApiGateway::DomainNameV2': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/domainnames/(?<DomainName>[^/:]+)',
        captureGroups: ['DomainName'],
    },
    'AWS::ApiGateway::GatewayResponse': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/gatewayresponses/(?<ResponseType>[^/:]+)',
        captureGroups: ['RestApiId', 'ResponseType'],
    },
    'AWS::ApiGateway::Method': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/resources/(?<ResourceId>[^/:]+)/methods/(?<HttpMethodType>[^/:]+)',
        captureGroups: ['RestApiId', 'ResourceId', 'HttpMethodType'],
    },
    'AWS::ApiGateway::Model': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^:/]+)/models/(?<ModelName>[^/:]+)',
        captureGroups: ['RestApiId', 'ModelName'],
    },
    'AWS::ApiGateway::RequestValidator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/requestvalidators/(?<RequestValidatorId>[^/:]+)',
        captureGroups: ['RestApiId', 'RequestValidatorId'],
    },
    'AWS::ApiGateway::Resource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/resources/(?<ResourceId>[^/:]+)',
        captureGroups: ['RestApiId', 'ResourceId'],
    },
    'AWS::ApiGateway::RestApi': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)',
        captureGroups: ['RestApiId'],
    },
    'AWS::ApiGateway::Stage': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/stages/(?<StageName>[^/:]+)',
        captureGroups: ['RestApiId', 'StageName'],
    },
    'AWS::ApiGateway::UsagePlan': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/usageplans/(?<UsagePlanId>[^/:]+)',
        captureGroups: ['UsagePlanId'],
    },
    'AWS::ApiGateway::UsagePlanKey': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/usageplans/(?<UsagePlanId>[^/:]+)/keys/(?<Id>[^/:]+)',
        captureGroups: ['UsagePlanId', 'Id'],
    },
    'AWS::ApiGateway::VpcLink': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/vpclinks/(?<VpcLinkId>[^/:]+)',
        captureGroups: ['VpcLinkId'],
    },
    'AWS::ApiGatewayV2::Api': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)',
        captureGroups: ['ApiId'],
    },
    'AWS::ApiGatewayV2::ApiMapping': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/domainnames/(?<DomainName>[^/:]+)/apimappings/(?<ApiMappingId>[^/:]+)',
        captureGroups: ['DomainName', 'ApiMappingId'],
    },
    'AWS::ApiGatewayV2::Authorizer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/authorizers/(?<AuthorizerId>[^/:]+)',
        captureGroups: ['ApiId', 'AuthorizerId'],
    },
    'AWS::ApiGatewayV2::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/deployments/(?<DeploymentId>[^/:]+)',
        captureGroups: ['ApiId', 'DeploymentId'],
    },
    'AWS::ApiGatewayV2::Integration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/integrations/(?<IntegrationId>[^/:]+)',
        captureGroups: ['ApiId', 'IntegrationId'],
    },
    'AWS::ApiGatewayV2::IntegrationResponse': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/integrations/(?<IntegrationId>[^/:]+)/integrationresponses/(?<IntegrationResponseId>[^/:]+)',
        captureGroups: ['ApiId', 'IntegrationId', 'IntegrationResponseId'],
    },
    'AWS::ApiGatewayV2::Model': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/models/(?<ModelId>[^/:]+)',
        captureGroups: ['ApiId', 'ModelId'],
    },
    'AWS::ApiGatewayV2::Route': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/routes/(?<RouteId>[^/:]+)',
        captureGroups: ['ApiId', 'RouteId'],
    },
    'AWS::ApiGatewayV2::RouteResponse': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/routes/(?<RouteId>[^/:]+)/routeresponses/(?<RouteResponseId>[^/:]+)',
        captureGroups: ['ApiId', 'RouteId', 'RouteResponseId'],
    },
    'AWS::ApiGatewayV2::RoutingRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/domainnames/(?<DomainName>[^/:]+)/routingrules/(?<RoutingRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainName', 'RoutingRuleId'],
    },
    'AWS::ApiGatewayV2::Stage': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/stages/(?<StageName>[^/:]+)',
        captureGroups: ['ApiId', 'StageName'],
    },
    'AWS::ApiGatewayV2::VpcLink': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/vpclinks/(?<VpcLinkId>[^/:]+)',
        captureGroups: ['VpcLinkId'],
    },
    'AWS::AppConfig::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::AppConfig::ConfigurationProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/configurationprofile/(?<ConfigurationProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'ConfigurationProfileId'],
    },
    'AWS::AppConfig::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/environment/(?<EnvironmentId>[^/:]+)/deployment/(?<DeploymentNumber>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'EnvironmentId', 'DeploymentNumber'],
    },
    'AWS::AppConfig::DeploymentStrategy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deploymentstrategy/(?<DeploymentStrategyId>[^/:]+)',
        captureGroups: ['AccountId', 'DeploymentStrategyId'],
    },
    'AWS::AppConfig::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/environment/(?<EnvironmentId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'EnvironmentId'],
    },
    'AWS::AppConfig::Extension': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):extension/(?<ExtensionId>[^/:]+)/(?<ExtensionVersionNumber>[^/:]+)',
        captureGroups: ['AccountId', 'ExtensionId', 'ExtensionVersionNumber'],
    },
    'AWS::AppConfig::ExtensionAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):extensionassociation/(?<ExtensionAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ExtensionAssociationId'],
    },
    'AWS::AppConfig::HostedConfigurationVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^:/]+)/configurationprofile/(?<ConfigurationProfileId>[^:/]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'ConfigurationProfileId'],
    },
    'AWS::AppFlow::Connector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appflow:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorLabel>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorLabel'],
    },
    'AWS::AppFlow::ConnectorProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appflow:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):connectorprofile/(?<ProfileName>[^/:]+)',
        captureGroups: ['Account', 'ProfileName'],
    },
    'AWS::AppFlow::Flow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appflow:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):flow/(?<FlowName>[^/:]+)',
        captureGroups: ['Account', 'FlowName'],
    },
    'AWS::AppIntegrations::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):app-integrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::AppIntegrations::DataIntegration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):app-integrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-integration/(?<DataIntegrationId>[^/:]+)',
        captureGroups: ['AccountId', 'DataIntegrationId'],
    },
    'AWS::AppIntegrations::EventIntegration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):app-integrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):event-integration/(?<EventIntegrationName>[^/:]+)',
        captureGroups: ['AccountId', 'EventIntegrationName'],
    },
    'AWS::AppMesh::GatewayRoute': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualGateway/(?<VirtualGatewayName>[^/:]+)/gatewayRoute/(?<GatewayRouteName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualGatewayName', 'GatewayRouteName'],
    },
    'AWS::AppMesh::Mesh': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName'],
    },
    'AWS::AppMesh::Route': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualRouter/(?<VirtualRouterName>[^/:]+)/route/(?<RouteName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualRouterName', 'RouteName'],
    },
    'AWS::AppMesh::VirtualGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualGateway/(?<VirtualGatewayName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualGatewayName'],
    },
    'AWS::AppMesh::VirtualNode': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualNode/(?<VirtualNodeName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualNodeName'],
    },
    'AWS::AppMesh::VirtualRouter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualRouter/(?<VirtualRouterName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualRouterName'],
    },
    'AWS::AppMesh::VirtualService': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appmesh:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mesh/(?<MeshName>[^/:]+)/virtualService/(?<VirtualServiceName>[^/:]+)',
        captureGroups: ['AccountId', 'MeshName', 'VirtualServiceName'],
    },
    'AWS::AppRunner::AutoScalingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apprunner:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):autoscalingconfiguration/(?<AutoscalingConfigurationName>[^/:]+)/(?<AutoscalingConfigurationVersion>[^/:]+)/(?<AutoscalingConfigurationId>[^/:]+)',
        captureGroups: [
            'AccountId',
            'AutoscalingConfigurationName',
            'AutoscalingConfigurationVersion',
            'AutoscalingConfigurationId',
        ],
    },
    'AWS::AppRunner::ObservabilityConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apprunner:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):observabilityconfiguration/(?<ObservabilityConfigurationName>[^/:]+)/(?<ObservabilityConfigurationVersion>[^/:]+)/(?<ObservabilityConfigurationId>[^/:]+)',
        captureGroups: [
            'AccountId',
            'ObservabilityConfigurationName',
            'ObservabilityConfigurationVersion',
            'ObservabilityConfigurationId',
        ],
    },
    'AWS::AppRunner::Service': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apprunner:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceName>[^/:]+)/(?<ServiceId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceName', 'ServiceId'],
    },
    'AWS::AppRunner::VpcConnector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apprunner:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpcconnector/(?<VpcConnectorName>[^/:]+)/(?<VpcConnectorVersion>[^/:]+)/(?<VpcConnectorId>[^/:]+)',
        captureGroups: ['AccountId', 'VpcConnectorName', 'VpcConnectorVersion', 'VpcConnectorId'],
    },
    'AWS::AppRunner::VpcIngressConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apprunner:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpcingressconnection/(?<VpcIngressConnectionName>[^/:]+)/(?<VpcIngressConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'VpcIngressConnectionName', 'VpcIngressConnectionId'],
    },
    'AWS::AppStream::AppBlock': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app-block/(?<AppBlockName>[^/:]+)',
        captureGroups: ['AccountId', 'AppBlockName'],
    },
    'AWS::AppStream::AppBlockBuilder': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app-block-builder/(?<AppBlockBuilderName>[^/:]+)',
        captureGroups: ['AccountId', 'AppBlockBuilderName'],
    },
    'AWS::AppStream::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName'],
    },
    'AWS::AppStream::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fleet/(?<FleetName>[^/:]+)',
        captureGroups: ['AccountId', 'FleetName'],
    },
    'AWS::AppStream::ImageBuilder': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image-builder/(?<ImageBuilderName>[^/:]+)',
        captureGroups: ['AccountId', 'ImageBuilderName'],
    },
    'AWS::AppStream::Stack': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stack/(?<StackName>[^/:]+)',
        captureGroups: ['AccountId', 'StackName'],
    },
    'AWS::AppSync::Api': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<ApiId>[^:/]+)',
        captureGroups: ['AccountId', 'ApiId'],
    },
    'AWS::AppSync::ChannelNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<ApiId>[^/:]+)/channelNamespace/(?<ChannelNamespaceName>[^/:]+)',
        captureGroups: ['AccountId', 'ApiId', 'ChannelNamespaceName'],
    },
    'AWS::AppSync::DataSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<GraphQLAPIId>[^/:]+)/datasources/(?<DatasourceName>[^/:]+)',
        captureGroups: ['AccountId', 'GraphQLAPIId', 'DatasourceName'],
    },
    'AWS::AppSync::DomainName': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domainnames/(?<DomainName>[^:/]+)',
        captureGroups: ['AccountId', 'DomainName'],
    },
    'AWS::AppSync::FunctionConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<GraphQLAPIId>[^:/]+)/functions/(?<FunctionId>[^:/]+)',
        captureGroups: ['AccountId', 'GraphQLAPIId', 'FunctionId'],
    },
    'AWS::AppSync::GraphQLApi': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<GraphQLAPIId>[^/:]+)',
        captureGroups: ['AccountId', 'GraphQLAPIId'],
    },
    'AWS::AppSync::SourceApiAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appsync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apis/(?<MergedGraphQLAPIId>[^/:]+)/sourceApiAssociations/(?<Associationid>[^/:]+)',
        captureGroups: ['AccountId', 'MergedGraphQLAPIId', 'Associationid'],
    },
    'AWS::AppTest::TestCase': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apptest:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):testcase/(?<TestCaseId>[^:/]+)',
        captureGroups: ['AccountId', 'TestCaseId'],
    },
    'AWS::ApplicationAutoScaling::ScalableTarget': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):application-autoscaling:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):scalable-target/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::ApplicationInsights::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):applicationinsights:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/resource-group/(?<ResourceGroupName>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceGroupName'],
    },
    'AWS::ApplicationSignals::ServiceLevelObjective': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):application-signals:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):slo/(?<SloName>[^:/]+)',
        captureGroups: ['AccountId', 'SloName'],
    },
    'AWS::Athena::CapacityReservation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):athena:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-reservation/(?<CapacityReservationName>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityReservationName'],
    },
    'AWS::Athena::DataCatalog': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):athena:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):datacatalog/(?<DataCatalogName>[^/:]+)',
        captureGroups: ['AccountId', 'DataCatalogName'],
    },
    'AWS::Athena::WorkGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):athena:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workgroup/(?<WorkGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'WorkGroupName'],
    },
    'AWS::AuditManager::Assessment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):auditmanager:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):assessment/(?<AssessmentId>[^/:]+)',
        captureGroups: ['Account', 'AssessmentId'],
    },
    'AWS::AutoScaling::AutoScalingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):autoscaling:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):autoScalingGroup:(?<GroupId>[^/:]+):autoScalingGroupName/(?<GroupFriendlyName>[^/:]+)',
        captureGroups: ['AccountId', 'GroupId', 'GroupFriendlyName'],
    },
    'AWS::AutoScaling::LaunchConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):autoscaling:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):launchConfiguration:(?<Id>[^/:]+):launchConfigurationName/(?<LaunchConfigurationName>[^/:]+)',
        captureGroups: ['AccountId', 'Id', 'LaunchConfigurationName'],
    },
    'AWS::B2BI::Capability': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):b2bi:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capability/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::B2BI::Partnership': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):b2bi:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):partnership/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::B2BI::Profile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):b2bi:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profile/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::B2BI::Transformer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):b2bi:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transformer/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::BCMDataExports::Export': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bcm-data-exports:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):export/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::Backup::BackupPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):backup-plan:(?<BackupPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'BackupPlanId'],
    },
    'AWS::Backup::Framework': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):framework:(?<FrameworkName>[^/:]+)-(?<FrameworkId>[^/:]+)',
        captureGroups: ['AccountId', 'FrameworkName', 'FrameworkId'],
    },
    'AWS::Backup::LogicallyAirGappedBackupVault': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):backup-vault:(?<BackupVaultName>[^/:]+)',
        captureGroups: ['AccountId', 'BackupVaultName'],
    },
    'AWS::Backup::ReportPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):report-plan:(?<ReportPlanName>[^/:]+)-(?<ReportPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'ReportPlanName', 'ReportPlanId'],
    },
    'AWS::Backup::RestoreTestingPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):restore-testing-plan:(?<RestoreTestingPlanName>[^/:]+)-(?<RestoreTestingPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'RestoreTestingPlanName', 'RestoreTestingPlanId'],
    },
    'AWS::Backup::TieringConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):tiering-configuration:(?<TieringConfigurationName>[^:/]+)-(?<TieringConfigurationId>[^:/]+)',
        captureGroups: ['AccountId', 'TieringConfigurationName', 'TieringConfigurationId'],
    },
    'AWS::BackupGateway::Hypervisor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup-gateway:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):hypervisor/(?<HypervisorId>[^/:]+)',
        captureGroups: ['AccountId', 'HypervisorId'],
    },
    'AWS::Batch::ComputeEnvironment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):compute-environment/(?<ComputeEnvironmentName>[^/:]+)',
        captureGroups: ['AccountId', 'ComputeEnvironmentName'],
    },
    'AWS::Batch::ConsumableResource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):consumable-resource/(?<ConsumableResourceName>[^/:]+)',
        captureGroups: ['AccountId', 'ConsumableResourceName'],
    },
    'AWS::Batch::JobDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):job-definition/(?<JobDefinitionName>[^/]+)',
        captureGroups: ['AccountId', 'JobDefinitionName'],
    },
    'AWS::Batch::JobQueue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):job-queue/(?<JobQueueName>[^/:]+)',
        captureGroups: ['AccountId', 'JobQueueName'],
    },
    'AWS::Batch::SchedulingPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):scheduling-policy/(?<SchedulingPolicyName>[^/:]+)',
        captureGroups: ['AccountId', 'SchedulingPolicyName'],
    },
    'AWS::Batch::ServiceEnvironment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):batch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service-environment/(?<ServiceEnvironmentName>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceEnvironmentName'],
    },
    'AWS::Bedrock::Agent': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agent/(?<AgentId>[^/:]+)',
        captureGroups: ['AccountId', 'AgentId'],
    },
    'AWS::Bedrock::AgentAlias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agent-alias/(?<AgentId>[^/:]+)/(?<AgentAliasId>[^/:]+)',
        captureGroups: ['AccountId', 'AgentId', 'AgentAliasId'],
    },
    'AWS::Bedrock::ApplicationInferenceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application-inference-profile/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Bedrock::AutomatedReasoningPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):automated-reasoning-policy/(?<AutomatedReasoningPolicyId>[^/:]+)',
        captureGroups: ['AccountId', 'AutomatedReasoningPolicyId'],
    },
    'AWS::Bedrock::AutomatedReasoningPolicyVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):automated-reasoning-policy/(?<AutomatedReasoningPolicyId>[^/:]+):(?<AutomatedReasoningPolicyVersion>[^/:]+)',
        captureGroups: ['AccountId', 'AutomatedReasoningPolicyId', 'AutomatedReasoningPolicyVersion'],
    },
    'AWS::Bedrock::Blueprint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):blueprint/(?<BlueprintId>[^/:]+)',
        captureGroups: ['AccountId', 'BlueprintId'],
    },
    'AWS::Bedrock::DataAutomationProject': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-automation-project/(?<ProjectId>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectId'],
    },
    'AWS::Bedrock::Flow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):flow/(?<FlowId>[^/:]+)',
        captureGroups: ['AccountId', 'FlowId'],
    },
    'AWS::Bedrock::FlowAlias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):flow/(?<FlowId>[^/:]+)/alias/(?<FlowAliasId>[^/:]+)',
        captureGroups: ['AccountId', 'FlowId', 'FlowAliasId'],
    },
    'AWS::Bedrock::Guardrail': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):guardrail/(?<GuardrailId>[^/:]+)',
        captureGroups: ['AccountId', 'GuardrailId'],
    },
    'AWS::Bedrock::IntelligentPromptRouter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):prompt-router/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Bedrock::KnowledgeBase': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):knowledge-base/(?<KnowledgeBaseId>[^/:]+)',
        captureGroups: ['AccountId', 'KnowledgeBaseId'],
    },
    'AWS::Bedrock::Prompt': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):prompt/(?<PromptId>[^/:]+)',
        captureGroups: ['AccountId', 'PromptId'],
    },
    'AWS::Bedrock::PromptVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):prompt/(?<PromptId>[^/:]+):(?<PromptVersion>[^/:]+)',
        captureGroups: ['AccountId', 'PromptId', 'PromptVersion'],
    },
    'AWS::BedrockAgentCore::BrowserCustom': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):browser-custom/(?<BrowserId>[^/:]+)',
        captureGroups: ['AccountId', 'BrowserId'],
    },
    'AWS::BedrockAgentCore::BrowserProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):browser-profile/(?<BrowserProfileId>[^:/]+)',
        captureGroups: ['AccountId', 'BrowserProfileId'],
    },
    'AWS::BedrockAgentCore::CodeInterpreterCustom': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):code-interpreter-custom/(?<CodeInterpreterId>[^/:]+)',
        captureGroups: ['AccountId', 'CodeInterpreterId'],
    },
    'AWS::BedrockAgentCore::Gateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId'],
    },
    'AWS::BedrockAgentCore::Memory': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):memory/(?<MemoryId>[^/:]+)',
        captureGroups: ['AccountId', 'MemoryId'],
    },
    'AWS::BedrockAgentCore::Runtime': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):runtime/(?<RuntimeId>[^/:]+)',
        captureGroups: ['AccountId', 'RuntimeId'],
    },
    'AWS::BedrockAgentCore::RuntimeEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):runtime/(?<RuntimeId>[^/:]+)/runtime-endpoint/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'RuntimeId', 'Name'],
    },
    'AWS::BedrockAgentCore::WorkloadIdentity': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-agentcore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workload-identity-directory/(?<DirectoryId>[^/:]+)/workload-identity/(?<WorkloadIdentityName>[^/:]+)',
        captureGroups: ['AccountId', 'DirectoryId', 'WorkloadIdentityName'],
    },
    'AWS::BedrockMantle::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):bedrock-mantle:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Billing::BillingView': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):billing::(?<AccountId>[0-9]{12}):billingview/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::BillingConductor::BillingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):billingconductor::(?<AccountId>[0-9]{12}):billinggroup/(?<BillingGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'BillingGroupId'],
    },
    'AWS::BillingConductor::CustomLineItem': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):billingconductor::(?<AccountId>[0-9]{12}):customlineitem/(?<CustomLineItemId>[^/:]+)',
        captureGroups: ['AccountId', 'CustomLineItemId'],
    },
    'AWS::BillingConductor::PricingPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):billingconductor::(?<AccountId>[0-9]{12}):pricingplan/(?<PricingPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'PricingPlanId'],
    },
    'AWS::BillingConductor::PricingRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):billingconductor::(?<AccountId>[0-9]{12}):pricingrule/(?<PricingRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'PricingRuleId'],
    },
    'AWS::Budgets::Budget': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):budgets::(?<Account>[0-9]{12}):budget/(?<BudgetName>(?![^:]+/action/)[^:]+)',
        captureGroups: ['Account', 'BudgetName'],
    },
    'AWS::Budgets::BudgetsAction': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):budgets::(?<AccountId>[0-9]{12}):budget/(?<BudgetName>[^:/]+)/action/(?<ActionId>[^:/]+)',
        captureGroups: ['AccountId', 'BudgetName', 'ActionId'],
    },
    'AWS::CE::AnomalyMonitor': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ce::(?<AccountId>[0-9]{12}):anomalymonitor/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::CE::AnomalySubscription': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ce::(?<AccountId>[0-9]{12}):anomalysubscription/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::CE::CostCategory': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ce::(?<AccountId>[0-9]{12}):costcategory/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::CUR::ReportDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cur:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):definition/(?<ReportName>[^:/]+)',
        captureGroups: ['AccountId', 'ReportName'],
    },
    'AWS::Cases::CaseRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cases:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)/case-rule/(?<CaseRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'CaseRuleId'],
    },
    'AWS::Cases::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cases:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::Cases::Field': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cases:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)/field/(?<FieldId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'FieldId'],
    },
    'AWS::Cases::Layout': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cases:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)/layout/(?<LayoutId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'LayoutId'],
    },
    'AWS::Cases::Template': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cases:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)/template/(?<TemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'TemplateId'],
    },
    'AWS::Cassandra::Keyspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cassandra:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/keyspace/(?<KeyspaceName>[a-zA-Z0-9_-]{1,48})/',
        captureGroups: ['AccountId', 'KeyspaceName'],
    },
    'AWS::Cassandra::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cassandra:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/keyspace/(?<KeyspaceName>[a-zA-Z0-9_-]{1,48})/table/(?<TableName>[a-zA-Z0-9_-]{1,48})',
        captureGroups: ['AccountId', 'KeyspaceName', 'TableName'],
    },
    'AWS::CertificateManager::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):acm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificate/(?<CertificateId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateId'],
    },
    'AWS::Chatbot::CustomAction': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):chatbot::(?<AccountId>[0-9]{12}):custom-action/(?<ActionName>[^:/]+)',
        captureGroups: ['AccountId', 'ActionName'],
    },
    'AWS::Chatbot::SlackChannelConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):chatbot::(?<AccountId>[0-9]{12}):chat-configuration/(?<ConfigurationType>[^:/]+)/(?<ChatbotConfigurationName>[^:/]+)',
        captureGroups: ['AccountId', 'ConfigurationType', 'ChatbotConfigurationName'],
    },
    'AWS::CleanRooms::AnalysisTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)/analysistemplate/(?<AnalysisTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId', 'AnalysisTemplateId'],
    },
    'AWS::CleanRooms::Collaboration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):collaboration/(?<CollaborationId>[^/:]+)',
        captureGroups: ['AccountId', 'CollaborationId'],
    },
    'AWS::CleanRooms::ConfiguredTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuredtable/(?<ConfiguredTableId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfiguredTableId'],
    },
    'AWS::CleanRooms::ConfiguredTableAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)/configuredtableassociation/(?<ConfiguredTableAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId', 'ConfiguredTableAssociationId'],
    },
    'AWS::CleanRooms::IdMappingTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)/idmappingtable/(?<IdMappingTableId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId', 'IdMappingTableId'],
    },
    'AWS::CleanRooms::IdNamespaceAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)/idnamespaceassociation/(?<IdNamespaceAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId', 'IdNamespaceAssociationId'],
    },
    'AWS::CleanRooms::Membership': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId'],
    },
    'AWS::CleanRooms::PrivacyBudgetTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):membership/(?<MembershipId>[^/:]+)/privacybudgettemplate/(?<PrivacyBudgetTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'MembershipId', 'PrivacyBudgetTemplateId'],
    },
    'AWS::CleanRoomsML::TrainingDataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cleanrooms-ml:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):training-dataset/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Cloud9::EnvironmentEC2': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloud9:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::CloudFormation::Stack': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudformation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stack/(?<StackName>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'StackName', 'Id'],
    },
    'AWS::CloudFormation::StackSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudformation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stackset/(?<StackSetName>[^/:]+):(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'StackSetName', 'Id'],
    },
    'AWS::CloudFormation::TypeActivation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudformation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):type/(?<TypeName>[a-z]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'TypeName', 'Id'],
    },
    'AWS::CloudFront::AnycastIpList': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):anycast-ip-list/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::CachePolicy': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):cache-policy/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::CloudFrontOriginAccessIdentity': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):origin-access-identity/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::ConnectionFunction': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):connection-function/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::ConnectionGroup': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):connection-group/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::ContinuousDeploymentPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):continuous-deployment-policy/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::Distribution': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):distribution/(?<DistributionId>[^/:]+)',
        captureGroups: ['AccountId', 'DistributionId'],
    },
    'AWS::CloudFront::DistributionTenant': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):distribution-tenant/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::Function': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):function/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::CloudFront::KeyValueStore': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):key-value-store/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::CloudFront::OriginAccessControl': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):origin-access-control/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::OriginRequestPolicy': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):origin-request-policy/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::RealtimeLogConfig': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):realtime-log-config/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::CloudFront::ResponseHeadersPolicy': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):response-headers-policy/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::StreamingDistribution': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):streaming-distribution/(?<DistributionId>[^/:]+)',
        captureGroups: ['AccountId', 'DistributionId'],
    },
    'AWS::CloudFront::TrustStore': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):trust-store/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::VpcOrigin': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):vpcorigin/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudTrail::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudtrail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel/(?<ChannelId>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelId'],
    },
    'AWS::CloudTrail::Dashboard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudtrail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dashboard/(?<DashboardName>[^/:]+)',
        captureGroups: ['AccountId', 'DashboardName'],
    },
    'AWS::CloudTrail::EventDataStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudtrail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):eventdatastore/(?<EventDataStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'EventDataStoreId'],
    },
    'AWS::CloudTrail::Trail': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudtrail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):trail/(?<TrailName>[^/:]+)',
        captureGroups: ['AccountId', 'TrailName'],
    },
    'AWS::CloudWatch::Alarm': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudwatch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):alarm:(?<AlarmName>.+)',
        captureGroups: ['AccountId', 'AlarmName'],
    },
    'AWS::CloudWatch::AlarmMuteRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudwatch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):alarm-mute-rule:(?<AlarmMuteRuleName>[^:/]+)',
        captureGroups: ['AccountId', 'AlarmMuteRuleName'],
    },
    'AWS::CloudWatch::Dashboard': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudwatch::(?<AccountId>[0-9]{12}):dashboard/(?<DashboardName>[^/:]+)',
        captureGroups: ['AccountId', 'DashboardName'],
    },
    'AWS::CloudWatch::InsightRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudwatch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):insight-rule/(?<InsightRuleName>[^/:]+)',
        captureGroups: ['AccountId', 'InsightRuleName'],
    },
    'AWS::CloudWatch::MetricStream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cloudwatch:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):metric-stream/(?<MetricStreamName>[^/:]+)',
        captureGroups: ['AccountId', 'MetricStreamName'],
    },
    'AWS::CodeArtifact::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeartifact:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainName'],
    },
    'AWS::CodeArtifact::PackageGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeartifact:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):package-group/(?<DomainName>[^/:]+)(?<EncodedPackageGroupPattern>[^:]+)',
        captureGroups: ['AccountId', 'DomainName', 'EncodedPackageGroupPattern'],
    },
    'AWS::CodeArtifact::Repository': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeartifact:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):repository/(?<DomainName>[^/:]+)/(?<RepositoryName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainName', 'RepositoryName'],
    },
    'AWS::CodeBuild::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codebuild:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fleet/(?<FleetName>[^/:]+):(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FleetName', 'FleetId'],
    },
    'AWS::CodeBuild::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codebuild:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName'],
    },
    'AWS::CodeBuild::ReportGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codebuild:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):report-group/(?<ReportGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ReportGroupName'],
    },
    'AWS::CodeCommit::Repository': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codecommit:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<RepositoryName>[^/:]+)',
        captureGroups: ['AccountId', 'RepositoryName'],
    },
    'AWS::CodeConnections::Connection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeconnections:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connection/(?<ConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectionId'],
    },
    'AWS::CodeDeploy::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codedeploy:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application:(?<ApplicationName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName'],
    },
    'AWS::CodeDeploy::DeploymentConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codedeploy:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deploymentconfig:(?<DeploymentConfigurationName>[^/:]+)',
        captureGroups: ['AccountId', 'DeploymentConfigurationName'],
    },
    'AWS::CodeDeploy::DeploymentGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codedeploy:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deploymentgroup:(?<ApplicationName>[^/:]+)/(?<DeploymentGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'DeploymentGroupName'],
    },
    'AWS::CodeGuruProfiler::ProfilingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeguru-profiler:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profilingGroup/(?<ProfilingGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ProfilingGroupName'],
    },
    'AWS::CodeGuruReviewer::RepositoryAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeguru-reviewer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):association:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::CodePipeline::CustomActionType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codepipeline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):actiontype:(?<Owner>[^/:]+)/(?<Category>[^/:]+)/(?<Provider>[^/:]+)/(?<Version>[^/:]+)',
        captureGroups: ['AccountId', 'Owner', 'Category', 'Provider', 'Version'],
    },
    'AWS::CodePipeline::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codepipeline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<PipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineName'],
    },
    'AWS::CodePipeline::Webhook': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codepipeline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):webhook:(?<WebhookName>[^/:]+)',
        captureGroups: ['AccountId', 'WebhookName'],
    },
    'AWS::CodeStar::GitHubRepository': {
        arnRegex: 'arn:(?<Partition>[^:/]+):codestar:(?<Region>[^:/]+):(?<Account>[^:/]+):project/(?<ProjectId>[^:/]+)',
        captureGroups: ['Account', 'ProjectId'],
    },
    'AWS::CodeStarConnections::Connection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codestar-connections:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connection/(?<ConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectionId'],
    },
    'AWS::CodeStarConnections::RepositoryLink': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codestar-connections:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):repository-link/(?<RepositoryLinkId>[^/:]+)',
        captureGroups: ['AccountId', 'RepositoryLinkId'],
    },
    'AWS::CodeStarNotifications::NotificationRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codestar-notifications:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):notificationrule/(?<NotificationRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'NotificationRuleId'],
    },
    'AWS::Cognito::IdentityPool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cognito-identity:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):identitypool/(?<IdentityPoolId>[a-zA-Z0-9_-]+:[0-9a-f-]+)',
        captureGroups: ['AccountId', 'IdentityPoolId'],
    },
    'AWS::Cognito::UserPool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):cognito-idp:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):userpool/(?<UserPoolId>[a-zA-Z0-9_-]+_[0-9a-zA-Z]+)',
        captureGroups: ['AccountId', 'UserPoolId'],
    },
    'AWS::Comprehend::DocumentClassifier': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):comprehend:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):document-classifier/(?<DocumentClassifierName>[^/:]+)',
        captureGroups: ['AccountId', 'DocumentClassifierName'],
    },
    'AWS::Comprehend::Flywheel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):comprehend:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):flywheel/(?<FlywheelName>[^/:]+)',
        captureGroups: ['AccountId', 'FlywheelName'],
    },
    'AWS::Config::AggregationAuthorization': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):aggregation-authorization/(?<AggregatorAccount>[^/:]+)/(?<AggregatorRegion>[^/:]+)',
        captureGroups: ['AccountId', 'AggregatorAccount', 'AggregatorRegion'],
    },
    'AWS::Config::ConfigRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):config-rule/(?<ConfigRuleId>[^:]+)',
        captureGroups: ['AccountId', 'ConfigRuleId'],
    },
    'AWS::Config::ConfigurationAggregator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):config-aggregator/(?<AggregatorId>[^:]+)',
        captureGroups: ['AccountId', 'AggregatorId'],
    },
    'AWS::Config::ConfigurationRecorder': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration-recorder/(?<RecorderName>[^/:]+)/(?<RecorderId>[^/:]+)',
        captureGroups: ['AccountId', 'RecorderName', 'RecorderId'],
    },
    'AWS::Config::ConformancePack': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):conformance-pack/(?<ConformancePackName>[^/:]+)/(?<ConformancePackId>[^/:]+)',
        captureGroups: ['AccountId', 'ConformancePackName', 'ConformancePackId'],
    },
    'AWS::Config::OrganizationConfigRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):organization-config-rule/(?<OrganizationConfigRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'OrganizationConfigRuleId'],
    },
    'AWS::Config::OrganizationConformancePack': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):organization-conformance-pack/(?<OrganizationConformancePackId>[^/:]+)',
        captureGroups: ['AccountId', 'OrganizationConformancePackId'],
    },
    'AWS::Config::RemediationConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):remediation-configuration/(?<RemediationConfigurationId>[^/:]+)',
        captureGroups: ['AccountId', 'RemediationConfigurationId'],
    },
    'AWS::Config::StoredQuery': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stored-query/(?<StoredQueryName>[^/:]+)/(?<StoredQueryId>[^/:]+)',
        captureGroups: ['AccountId', 'StoredQueryName', 'StoredQueryId'],
    },
    'AWS::Connect::AgentStatus': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/agent-state/(?<AgentStatusId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'AgentStatusId'],
    },
    'AWS::Connect::ContactFlow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/contact-flow/(?<ContactFlowId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'ContactFlowId'],
    },
    'AWS::Connect::ContactFlowModule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/flow-module/(?<ContactFlowModuleId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'ContactFlowModuleId'],
    },
    'AWS::Connect::DataTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/data-table/(?<DataTableId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'DataTableId'],
    },
    'AWS::Connect::EmailAddress': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/email-address/(?<EmailAddressId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'EmailAddressId'],
    },
    'AWS::Connect::EvaluationForm': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/evaluation-form/(?<FormId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'FormId'],
    },
    'AWS::Connect::HoursOfOperation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/operating-hours/(?<HoursOfOperationId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'HoursOfOperationId'],
    },
    'AWS::Connect::Instance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId'],
    },
    'AWS::Connect::IntegrationAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/integration-association/(?<IntegrationAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'IntegrationAssociationId'],
    },
    'AWS::Connect::Notification': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^:/]+)/notification/(?<NotificationId>[^:/]+)',
        captureGroups: ['AccountId', 'InstanceId', 'NotificationId'],
    },
    'AWS::Connect::PhoneNumber': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):phone-number/(?<PhoneNumberId>[^/:]+)',
        captureGroups: ['AccountId', 'PhoneNumberId'],
    },
    'AWS::Connect::Prompt': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/prompt/(?<PromptId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'PromptId'],
    },
    'AWS::Connect::Queue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/queue/(?<QueueId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'QueueId'],
    },
    'AWS::Connect::QuickConnect': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/transfer-destination/(?<QuickConnectId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'QuickConnectId'],
    },
    'AWS::Connect::RoutingProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/routing-profile/(?<RoutingProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'RoutingProfileId'],
    },
    'AWS::Connect::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/rule/(?<RuleId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'RuleId'],
    },
    'AWS::Connect::SecurityProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/security-profile/(?<SecurityProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'SecurityProfileId'],
    },
    'AWS::Connect::TaskTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/task-template/(?<TaskTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'TaskTemplateId'],
    },
    'AWS::Connect::TrafficDistributionGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):traffic-distribution-group/(?<TrafficDistributionGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'TrafficDistributionGroupId'],
    },
    'AWS::Connect::User': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/agent/(?<UserId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'UserId'],
    },
    'AWS::Connect::UserHierarchyGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^:/]+)/agent-group/(?<HierarchyGroupId>[^:/]+)',
        captureGroups: ['AccountId', 'InstanceId', 'HierarchyGroupId'],
    },
    'AWS::Connect::View': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^:/]+)/view/(?<ViewId>[^:/]+)',
        captureGroups: ['AccountId', 'InstanceId', 'ViewId'],
    },
    'AWS::Connect::ViewVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^:/]+)/view/(?<ViewId>[^:/]+):(?<ViewVersion>[^:/]+)',
        captureGroups: ['AccountId', 'InstanceId', 'ViewId', 'ViewVersion'],
    },
    'AWS::Connect::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/workspace/(?<WorkspaceId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'WorkspaceId'],
    },
    'AWS::ConnectCampaigns::Campaign': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect-campaigns:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):campaign/(?<CampaignId>[^/:]+)',
        captureGroups: ['AccountId', 'CampaignId'],
    },
    'AWS::ControlTower::EnabledBaseline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):controltower:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):enabledbaseline/(?<EnabledBaselineId>[^/:]+)',
        captureGroups: ['AccountId', 'EnabledBaselineId'],
    },
    'AWS::ControlTower::EnabledControl': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):controltower:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):enabledcontrol/(?<EnabledControlId>[^/:]+)',
        captureGroups: ['AccountId', 'EnabledControlId'],
    },
    'AWS::ControlTower::LandingZone': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):controltower:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):landingzone/(?<LandingZoneId>[^/:]+)',
        captureGroups: ['AccountId', 'LandingZoneId'],
    },
    'AWS::CustomerProfiles::CalculatedAttributeDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domains/(?<DomainName>[^:/]+)/calculated-attributes/(?<CalculatedAttributeName>[^:/]+)',
        captureGroups: ['AccountId', 'DomainName', 'CalculatedAttributeName'],
    },
    'AWS::CustomerProfiles::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domains/(?<DomainName>[a-zA-Z0-9_-]+)',
        captureGroups: ['Account', 'DomainName'],
    },
    'AWS::CustomerProfiles::EventStream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domains/(?<DomainName>[^:/]+)/event-streams/(?<EventStreamName>[^:/]+)',
        captureGroups: ['AccountId', 'DomainName', 'EventStreamName'],
    },
    'AWS::CustomerProfiles::Integration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domains/(?<DomainName>[a-zA-Z0-9_-]+)/integrations/(?<Uri>.+)',
        captureGroups: ['Account', 'DomainName', 'Uri'],
    },
    'AWS::CustomerProfiles::ObjectType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domains/(?<DomainName>[a-zA-Z0-9_-]+)/object-types/(?<ObjectTypeName>[a-zA-Z_][a-zA-Z_0-9-]*)',
        captureGroups: ['Account', 'DomainName', 'ObjectTypeName'],
    },
    'AWS::DAX::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dax:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cache/(?<ClusterName>[^:/]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::DLM::LifecyclePolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dlm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):policy/(?<PolicyId>[^/:]+)',
        captureGroups: ['Account', 'PolicyId'],
    },
    'AWS::DMS::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cert:(?<CertificateId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateId'],
    },
    'AWS::DMS::DataMigration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-migration:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DMS::DataProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-provider:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DMS::Endpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):endpoint:(?<EndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'EndpointId'],
    },
    'AWS::DMS::EventSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):es:(?<SubscriptionName>[^/:]+)',
        captureGroups: ['AccountId', 'SubscriptionName'],
    },
    'AWS::DMS::InstanceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance-profile:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DMS::MigrationProject': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):migration-project:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DMS::ReplicationConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):replication-config:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DMS::ReplicationInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rep:(?<InstanceId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId'],
    },
    'AWS::DMS::ReplicationSubnetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):subgrp:(?<GroupNameName>[^/:]+)',
        captureGroups: ['AccountId', 'GroupNameName'],
    },
    'AWS::DMS::ReplicationTask': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):task:(?<TaskId>[^/:]+)',
        captureGroups: ['AccountId', 'TaskId'],
    },
    'AWS::DSQL::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dsql:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<Identifier>[^:/]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::DataBrew::Dataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataBrew::Job': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):job/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataBrew::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataBrew::Recipe': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):recipe/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataBrew::Ruleset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ruleset/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataBrew::Schedule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):databrew:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schedule/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DataPipeline::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datapipeline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipeline/(?<PipelineID>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineID'],
    },
    'AWS::DataSync::Agent': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datasync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agent/(?<AgentId>[^:/]+)',
        captureGroups: ['AccountId', 'AgentId'],
    },
    'AWS::DataSync::LocationEFS': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):datasync:(?<Region>[^:/]+):(?<AccountId>[^:/]+):location/(?<LocationId>[^:/]+)',
        captureGroups: ['AccountId', 'LocationId'],
    },
    'AWS::DataSync::Task': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datasync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):task/(?<TaskId>[^:/]+)',
        captureGroups: ['AccountId', 'TaskId'],
    },
    'AWS::DataZone::DataSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datazonecontrol:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-source/(?<DomainId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::DataZone::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datazone:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^:/]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::DataZone::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datazonecontrol:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::Deadline::Farm': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):deadline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):farm/(?<FarmId>[^/:]+)',
        captureGroups: ['AccountId', 'FarmId'],
    },
    'AWS::Deadline::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):deadline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):farm/(?<FarmId>[^/:]+)/fleet/(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FarmId', 'FleetId'],
    },
    'AWS::Deadline::LicenseEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):deadline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):license-endpoint/(?<LicenseEndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'LicenseEndpointId'],
    },
    'AWS::Deadline::Monitor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):deadline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):monitor/(?<MonitorId>[^/:]+)',
        captureGroups: ['AccountId', 'MonitorId'],
    },
    'AWS::Deadline::Queue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):deadline:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):farm/(?<FarmId>[^/:]+)/queue/(?<QueueId>[^/:]+)',
        captureGroups: ['AccountId', 'FarmId', 'QueueId'],
    },
    'AWS::Detective::Graph': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):detective:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):graph:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DevOpsAgent::AgentSpace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aidevops:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agentspace/(?<AgentSpaceId>[^:/]+)',
        captureGroups: ['AccountId', 'AgentSpaceId'],
    },
    'AWS::DevOpsAgent::Association': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aidevops:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agentspace/(?<AgentSpaceId>[^:/]+)/associations/(?<AssociationId>[^:/]+)',
        captureGroups: ['AccountId', 'AgentSpaceId', 'AssociationId'],
    },
    'AWS::DeviceFarm::DevicePool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):devicepool:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DeviceFarm::InstanceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):instanceprofile:(?<InstanceProfileId>[^/:]+)',
        captureGroups: ['Account', 'InstanceProfileId'],
    },
    'AWS::DeviceFarm::NetworkProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12})?:networkprofile:((?<ProjectId>[^/:]+)/)?(?<NetworkProfileId>[^/:]+)',
        captureGroups: ['Account', 'ProjectId', 'NetworkProfileId'],
    },
    'AWS::DeviceFarm::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):project:(?<ProjectId>[^/:]+)',
        captureGroups: ['Account', 'ProjectId'],
    },
    'AWS::DeviceFarm::TestGridProject': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):testgrid-project:(?<TestGridProjectId>[^/:]+)',
        captureGroups: ['Account', 'TestGridProjectId'],
    },
    'AWS::DeviceFarm::VPCEConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpceconfiguration:(?<VpceConfigurationId>[^/:]+)',
        captureGroups: ['Account', 'VpceConfigurationId'],
    },
    'AWS::DirectoryService::MicrosoftAD': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):directory/(?<DirectoryId>[^:/]+)',
        captureGroups: ['AccountId', 'DirectoryId'],
    },
    'AWS::DocDB::DBCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<DbClusterInstanceName>[^/:]+)',
        captureGroups: ['AccountId', 'DbClusterInstanceName'],
    },
    'AWS::DocDB::DBClusterParameterGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):cluster-pg:(?<ClusterParameterGroupName>[^/:]+)',
        captureGroups: ['Account', 'ClusterParameterGroupName'],
    },
    'AWS::DocDB::DBInstance': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):db:(?<DbInstanceName>[^/:]+)',
        captureGroups: ['Account', 'DbInstanceName'],
    },
    'AWS::DocDB::DBSubnetGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):subgrp:(?<SubnetGroupName>[^/:]+)',
        captureGroups: ['Account', 'SubnetGroupName'],
    },
    'AWS::DocDBElastic::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):docdb-elastic:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DynamoDB::GlobalTable': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):dynamodb::(?<AccountId>[0-9]{12}):global-table/(?<GlobalTableName>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalTableName'],
    },
    'AWS::DynamoDB::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dynamodb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):table/(?<TableName>[^/:]+)',
        captureGroups: ['AccountId', 'TableName'],
    },
    'AWS::EC2::CapacityManagerDataExport': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-manager-data-export/(?<CapacityManagerDataExportId>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityManagerDataExportId'],
    },
    'AWS::EC2::CapacityReservation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-reservation/(?<CapacityReservationId>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityReservationId'],
    },
    'AWS::EC2::CapacityReservationFleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-reservation-fleet/(?<CapacityReservationFleetId>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityReservationFleetId'],
    },
    'AWS::EC2::CarrierGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):carrier-gateway/(?<CarrierGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'CarrierGatewayId'],
    },
    'AWS::EC2::ClientVpnEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):client-vpn-endpoint/(?<ClientVpnEndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'ClientVpnEndpointId'],
    },
    'AWS::EC2::CustomerGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):customer-gateway/(?<CustomerGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'CustomerGatewayId'],
    },
    'AWS::EC2::DHCPOptions': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dhcp-options/(?<DhcpOptionsId>[^/:]+)',
        captureGroups: ['AccountId', 'DhcpOptionsId'],
    },
    'AWS::EC2::EC2Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fleet/(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FleetId'],
    },
    'AWS::EC2::EIP': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):elastic-ip/(?<AllocationId>[^/:]+)',
        captureGroups: ['AccountId', 'AllocationId'],
    },
    'AWS::EC2::EgressOnlyInternetGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):egress-only-internet-gateway/(?<EgressOnlyInternetGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'EgressOnlyInternetGatewayId'],
    },
    'AWS::EC2::FlowLog': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpc-flow-log/(?<FlowLogId>[^/:]+)',
        captureGroups: ['AccountId', 'FlowLogId'],
    },
    'AWS::EC2::Host': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dedicated-host/(?<DedicatedHostId>[^/:]+)',
        captureGroups: ['AccountId', 'DedicatedHostId'],
    },
    'AWS::EC2::IPAM': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ec2::(?<Account>[0-9]{12}):ipam/(?<IpamId>[^/:]+)',
        captureGroups: ['Account', 'IpamId'],
    },
    'AWS::EC2::IPAMPool': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ec2::(?<Account>[0-9]{12}):ipam-pool/(?<IpamPoolId>[^/:]+)',
        captureGroups: ['Account', 'IpamPoolId'],
    },
    'AWS::EC2::IPAMPrefixListResolver': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2::(?<AccountId>[0-9]{12}):ipam-prefix-list-resolver/(?<IpamPrefixListResolverId>[^:/]+)',
        captureGroups: ['AccountId', 'IpamPrefixListResolverId'],
    },
    'AWS::EC2::IPAMResourceDiscovery': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2::(?<AccountId>[0-9]{12}):ipam-resource-discovery/(?<IpamResourceDiscoveryId>[^/:]+)',
        captureGroups: ['AccountId', 'IpamResourceDiscoveryId'],
    },
    'AWS::EC2::IPAMResourceDiscoveryAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2::(?<AccountId>[0-9]{12}):ipam-resource-discovery-association/(?<IpamResourceDiscoveryAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'IpamResourceDiscoveryAssociationId'],
    },
    'AWS::EC2::IPAMScope': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ec2::(?<Account>[0-9]{12}):ipam-scope/(?<IpamScopeId>[^/:]+)',
        captureGroups: ['Account', 'IpamScopeId'],
    },
    'AWS::EC2::Instance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId'],
    },
    'AWS::EC2::InstanceConnectEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance-connect-endpoint/(?<InstanceConnectEndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceConnectEndpointId'],
    },
    'AWS::EC2::InternetGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):internet-gateway/(?<InternetGatewayId>[^/:]+)',
        captureGroups: ['Account', 'InternetGatewayId'],
    },
    'AWS::EC2::KeyPair': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):key-pair/(?<KeyPairId>[^/:]+)',
        captureGroups: ['Account', 'KeyPairId'],
    },
    'AWS::EC2::LaunchTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):launch-template/(?<LaunchTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'LaunchTemplateId'],
    },
    'AWS::EC2::LocalGatewayRouteTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):local-gateway-route-table/(?<LocalGatewayRoutetableId>[^/:]+)',
        captureGroups: ['AccountId', 'LocalGatewayRoutetableId'],
    },
    'AWS::EC2::LocalGatewayRouteTableVPCAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):local-gateway-route-table-vpc-association/(?<LocalGatewayRouteTableVpcAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'LocalGatewayRouteTableVpcAssociationId'],
    },
    'AWS::EC2::LocalGatewayRouteTableVirtualInterfaceGroupAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):local-gateway-route-table-virtual-interface-group-association/(?<LocalGatewayRouteTableVirtualInterfaceGroupAssociationId>[^/:]+)',
        captureGroups: ['Account', 'LocalGatewayRouteTableVirtualInterfaceGroupAssociationId'],
    },
    'AWS::EC2::LocalGatewayVirtualInterface': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):local-gateway-virtual-interface/(?<LocalGatewayVirtualInterfaceId>[^/:]+)',
        captureGroups: ['AccountId', 'LocalGatewayVirtualInterfaceId'],
    },
    'AWS::EC2::LocalGatewayVirtualInterfaceGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):local-gateway-virtual-interface-group/(?<LocalGatewayVirtualInterfaceGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'LocalGatewayVirtualInterfaceGroupId'],
    },
    'AWS::EC2::NatGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):natgateway/(?<NatGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'NatGatewayId'],
    },
    'AWS::EC2::NetworkAcl': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):network-acl/(?<NaclId>[^/:]+)',
        captureGroups: ['AccountId', 'NaclId'],
    },
    'AWS::EC2::NetworkInsightsAccessScope': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):network-insights-access-scope/(?<NetworkInsightsAccessScopeId>[^/:]+)',
        captureGroups: ['Account', 'NetworkInsightsAccessScopeId'],
    },
    'AWS::EC2::NetworkInsightsAccessScopeAnalysis': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):network-insights-access-scope-analysis/(?<NetworkInsightsAccessScopeAnalysisId>[^/:]+)',
        captureGroups: ['Account', 'NetworkInsightsAccessScopeAnalysisId'],
    },
    'AWS::EC2::NetworkInsightsAnalysis': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):network-insights-analysis/(?<NetworkInsightsAnalysisId>[^/:]+)',
        captureGroups: ['Account', 'NetworkInsightsAnalysisId'],
    },
    'AWS::EC2::NetworkInsightsPath': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):network-insights-path/(?<NetworkInsightsPathId>[^/:]+)',
        captureGroups: ['Account', 'NetworkInsightsPathId'],
    },
    'AWS::EC2::NetworkInterface': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):network-interface/(?<NetworkInterfaceId>[^/:]+)',
        captureGroups: ['Account', 'NetworkInterfaceId'],
    },
    'AWS::EC2::PlacementGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):placement-group/(?<PlacementGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'PlacementGroupName'],
    },
    'AWS::EC2::PrefixList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>aws|[0-9]{12}):prefix-list/(?<PrefixListId>[^/:]+)',
        captureGroups: ['AccountId', 'PrefixListId'],
    },
    'AWS::EC2::RouteServer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):route-server/(?<RouteServerId>[^/:]+)',
        captureGroups: ['AccountId', 'RouteServerId'],
    },
    'AWS::EC2::RouteServerEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):route-server-endpoint/(?<RouteServerEndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'RouteServerEndpointId'],
    },
    'AWS::EC2::RouteServerPeer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):route-server-peer/(?<RouteServerPeerId>[^/:]+)',
        captureGroups: ['AccountId', 'RouteServerPeerId'],
    },
    'AWS::EC2::RouteTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):route-table/(?<RouteTableId>[^/:]+)',
        captureGroups: ['AccountId', 'RouteTableId'],
    },
    'AWS::EC2::SecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):security-group/(?<SecurityGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupId'],
    },
    'AWS::EC2::SecurityGroupEgress': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):security-group-rule/(?<SecurityGroupRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupRuleId'],
    },
    'AWS::EC2::SecurityGroupIngress': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):security-group-rule/(?<SecurityGroupRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupRuleId'],
    },
    'AWS::EC2::SpotFleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):spot-fleet-request/(?<SpotFleetRequestId>[^/:]+)',
        captureGroups: ['AccountId', 'SpotFleetRequestId'],
    },
    'AWS::EC2::Subnet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):subnet/(?<SubnetId>[^/:]+)',
        captureGroups: ['Account', 'SubnetId'],
    },
    'AWS::EC2::TrafficMirrorFilter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):traffic-mirror-filter/(?<TrafficMirrorFilterId>[^/:]+)',
        captureGroups: ['Account', 'TrafficMirrorFilterId'],
    },
    'AWS::EC2::TrafficMirrorFilterRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):traffic-mirror-filter-rule/(?<TrafficMirrorFilterRuleId>[^/:]+)',
        captureGroups: ['Account', 'TrafficMirrorFilterRuleId'],
    },
    'AWS::EC2::TrafficMirrorSession': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):traffic-mirror-session/(?<TrafficMirrorSessionId>[^/:]+)',
        captureGroups: ['AccountId', 'TrafficMirrorSessionId'],
    },
    'AWS::EC2::TrafficMirrorTarget': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):traffic-mirror-target/(?<TrafficMirrorTargetId>[^/:]+)',
        captureGroups: ['AccountId', 'TrafficMirrorTargetId'],
    },
    'AWS::EC2::TransitGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):transit-gateway/(?<TransitGatewayId>[^/:]+)',
        captureGroups: ['Account', 'TransitGatewayId'],
    },
    'AWS::EC2::TransitGatewayAttachment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-attachment/(?<TransitGatewayAttachmentId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayAttachmentId'],
    },
    'AWS::EC2::TransitGatewayConnectPeer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-connect-peer/(?<TransitGatewayConnectPeerId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayConnectPeerId'],
    },
    'AWS::EC2::TransitGatewayMeteringPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-metering-policy/(?<TransitGatewayMeteringPolicyId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayMeteringPolicyId'],
    },
    'AWS::EC2::TransitGatewayMulticastDomain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-multicast-domain/(?<TransitGatewayMulticastDomainId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayMulticastDomainId'],
    },
    'AWS::EC2::TransitGatewayRouteTable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-route-table/(?<TransitGatewayRouteTableId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayRouteTableId'],
    },
    'AWS::EC2::VPC': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpc/(?<VpcId>[^/:]+)',
        captureGroups: ['AccountId', 'VpcId'],
    },
    'AWS::EC2::VPCBlockPublicAccessExclusion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpc-block-public-access-exclusion/(?<VpcBlockPublicAccessExclusionId>[^/:]+)',
        captureGroups: ['AccountId', 'VpcBlockPublicAccessExclusionId'],
    },
    'AWS::EC2::VPCEncryptionControl': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpc-encryption-control/(?<VpcEncryptionControlId>[^/:]+)',
        captureGroups: ['AccountId', 'VpcEncryptionControlId'],
    },
    'AWS::EC2::VPCEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpc-endpoint/(?<VpcEndpointId>[^/:]+)',
        captureGroups: ['Account', 'VpcEndpointId'],
    },
    'AWS::EC2::VPCEndpointService': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpc-endpoint-service/(?<VpcEndpointServiceId>[^/:]+)',
        captureGroups: ['Account', 'VpcEndpointServiceId'],
    },
    'AWS::EC2::VPCEndpointServicePermissions': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):ec2:(?<Region>[^:/]+):(?<Account>[^:/]+):vpc-endpoint-service-permission/(?<VpcEndpointServicePermissionId>[^:/]+)',
        captureGroups: ['Account', 'VpcEndpointServicePermissionId'],
    },
    'AWS::EC2::VPCPeeringConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpc-peering-connection/(?<VpcPeeringConnectionId>[^/:]+)',
        captureGroups: ['Account', 'VpcPeeringConnectionId'],
    },
    'AWS::EC2::VPNConcentrator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpn-concentrator/(?<VpnConcentratorId>[^/:]+)',
        captureGroups: ['AccountId', 'VpnConcentratorId'],
    },
    'AWS::EC2::VPNConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpn-connection/(?<VpnConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'VpnConnectionId'],
    },
    'AWS::EC2::VPNGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpn-gateway/(?<VpnGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'VpnGatewayId'],
    },
    'AWS::EC2::VerifiedAccessEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):verified-access-endpoint/(?<VerifiedAccessEndpointId>[^/:]+)',
        captureGroups: ['Account', 'VerifiedAccessEndpointId'],
    },
    'AWS::EC2::VerifiedAccessGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):verified-access-group/(?<VerifiedAccessGroupId>[^/:]+)',
        captureGroups: ['Account', 'VerifiedAccessGroupId'],
    },
    'AWS::EC2::VerifiedAccessInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):verified-access-instance/(?<VerifiedAccessInstanceId>[^/:]+)',
        captureGroups: ['Account', 'VerifiedAccessInstanceId'],
    },
    'AWS::EC2::VerifiedAccessTrustProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):verified-access-trust-provider/(?<VerifiedAccessTrustProviderId>[^/:]+)',
        captureGroups: ['Account', 'VerifiedAccessTrustProviderId'],
    },
    'AWS::EC2::Volume': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):volume/(?<VolumeId>[^/:]+)',
        captureGroups: ['AccountId', 'VolumeId'],
    },
    'AWS::ECR::PublicRepository': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ecr-public::(?<AccountId>[0-9]{12}):repository/(?<RepositoryName>[^/:]+)',
        captureGroups: ['AccountId', 'RepositoryName'],
    },
    'AWS::ECR::Repository': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecr:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):repository/(?<RepositoryName>[^:]+)',
        captureGroups: ['AccountId', 'RepositoryName'],
    },
    'AWS::ECS::CapacityProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-provider/(?<CapacityProviderName>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityProviderName'],
    },
    'AWS::ECS::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::ECS::Service': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ClusterName>[^/:]+)/(?<ServiceName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'ServiceName'],
    },
    'AWS::ECS::TaskDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):task-definition/(?<TaskDefinitionFamilyName>[^/:]+):(?<TaskDefinitionRevisionNumber>[^/:]+)',
        captureGroups: ['AccountId', 'TaskDefinitionFamilyName', 'TaskDefinitionRevisionNumber'],
    },
    'AWS::ECS::TaskSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ecs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):task-set/(?<ClusterName>[^/:]+)/(?<ServiceName>[^/:]+)/(?<TaskSetId>[^:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'ServiceName', 'TaskSetId'],
    },
    'AWS::EFS::AccessPoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticfilesystem:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-point/(?<AccessPointId>[^/:]+)',
        captureGroups: ['AccountId', 'AccessPointId'],
    },
    'AWS::EFS::FileSystem': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticfilesystem:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):file-system/(?<FileSystemId>[^/:]+)',
        captureGroups: ['AccountId', 'FileSystemId'],
    },
    'AWS::EKS::AccessEntry': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-entry/(?<ClusterName>[^/:]+)/(?<IamIdentityType>[^/:]+)/(?<IamIdentityAccountID>[^/:]+)/(?<IamIdentityName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: [
            'AccountId',
            'ClusterName',
            'IamIdentityType',
            'IamIdentityAccountID',
            'IamIdentityName',
            'UUID',
        ],
    },
    'AWS::EKS::Addon': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):addon/(?<ClusterName>[^/:]+)/(?<AddonName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'AddonName', 'UUID'],
    },
    'AWS::EKS::Capability': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capability/(?<ClusterName>[^/:]+)/(?<CapabilityType>[^/:]+)/(?<CapabilityName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'CapabilityType', 'CapabilityName', 'UUID'],
    },
    'AWS::EKS::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::EKS::FargateProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fargateprofile/(?<ClusterName>[^/:]+)/(?<FargateProfileName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'FargateProfileName', 'UUID'],
    },
    'AWS::EKS::IdentityProviderConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):identityproviderconfig/(?<ClusterName>[^/:]+)/(?<IdentityProviderType>[^/:]+)/(?<IdentityProviderConfigName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'IdentityProviderType', 'IdentityProviderConfigName', 'UUID'],
    },
    'AWS::EKS::Nodegroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):nodegroup/(?<ClusterName>[^/:]+)/(?<NodegroupName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'NodegroupName', 'UUID'],
    },
    'AWS::EKS::PodIdentityAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):podidentityassociation/(?<ClusterName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'UUID'],
    },
    'AWS::EMR::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticmapreduce:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterId'],
    },
    'AWS::EMR::Studio': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticmapreduce:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):studio/(?<StudioId>[^/:]+)',
        captureGroups: ['AccountId', 'StudioId'],
    },
    'AWS::EMRContainers::Endpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):emr-containers:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/virtualclusters/(?<VirtualClusterId>[^/:]+)/endpoints/(?<EndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'VirtualClusterId', 'EndpointId'],
    },
    'AWS::EMRContainers::SecurityConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):emr-containers:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/securityconfigurations/(?<SecurityConfigurationId>[^:/]+)',
        captureGroups: ['AccountId', 'SecurityConfigurationId'],
    },
    'AWS::EMRContainers::VirtualCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):emr-containers:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/virtualclusters/(?<VirtualClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'VirtualClusterId'],
    },
    'AWS::EMRServerless::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):emr-serverless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/applications/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::EVS::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentIdentifier'],
    },
    'AWS::ElastiCache::CacheCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<CacheClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'CacheClusterId'],
    },
    'AWS::ElastiCache::GlobalReplicationGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache::(?<AccountId>[0-9]{12}):globalreplicationgroup:(?<GlobalReplicationGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalReplicationGroupId'],
    },
    'AWS::ElastiCache::ParameterGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):parametergroup:(?<CacheParameterGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'CacheParameterGroupName'],
    },
    'AWS::ElastiCache::ReplicationGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):replicationgroup:(?<ReplicationGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'ReplicationGroupId'],
    },
    'AWS::ElastiCache::SecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):securitygroup:(?<CacheSecurityGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'CacheSecurityGroupName'],
    },
    'AWS::ElastiCache::ServerlessCache': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):serverlesscache:(?<ServerlessCacheName>[^/:]+)',
        captureGroups: ['AccountId', 'ServerlessCacheName'],
    },
    'AWS::ElastiCache::SubnetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):subnetgroup:(?<CacheSubnetGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'CacheSubnetGroupName'],
    },
    'AWS::ElastiCache::User': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):user:(?<UserId>[^/:]+)',
        captureGroups: ['AccountId', 'UserId'],
    },
    'AWS::ElastiCache::UserGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticache:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):usergroup:(?<UserGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'UserGroupId'],
    },
    'AWS::ElasticBeanstalk::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticbeanstalk:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName'],
    },
    'AWS::ElasticBeanstalk::ApplicationVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticbeanstalk:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):applicationversion/(?<ApplicationName>[^/:]+)/(?<VersionLabel>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'VersionLabel'],
    },
    'AWS::ElasticBeanstalk::ConfigurationTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticbeanstalk:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configurationtemplate/(?<ApplicationName>[^/:]+)/(?<TemplateName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'TemplateName'],
    },
    'AWS::ElasticBeanstalk::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticbeanstalk:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<ApplicationName>[^/]+)/(?<EnvironmentName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'EnvironmentName'],
    },
    'AWS::ElasticLoadBalancing::LoadBalancer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):loadbalancer/(?<LoadBalancerType>[^/:]+)/(?<LoadBalancerName>[^/:]+)/(?<LoadBalancerId>[^/:]+)',
        captureGroups: ['AccountId', 'LoadBalancerType', 'LoadBalancerName', 'LoadBalancerId'],
    },
    'AWS::ElasticLoadBalancingV2::Listener': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):listener/app/(?<LoadBalancerName>[^/:]+)/(?<LoadBalancerId>[^/:]+)/(?<ListenerId>[^/:]+)',
        captureGroups: ['AccountId', 'LoadBalancerName', 'LoadBalancerId', 'ListenerId'],
    },
    'AWS::ElasticLoadBalancingV2::ListenerRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):listener-rule/app/(?<LoadBalancerName>[^:/]+)/(?<LoadBalancerId>[^:/]+)/(?<ListenerId>[^:/]+)/(?<ListenerRuleId>[^:/]+)',
        captureGroups: ['AccountId', 'LoadBalancerName', 'LoadBalancerId', 'ListenerId', 'ListenerRuleId'],
    },
    'AWS::ElasticLoadBalancingV2::LoadBalancer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):loadbalancer/app/(?<LoadBalancerName>[^:/]+)/(?<LoadBalancerId>[^:/]+)',
        captureGroups: ['AccountId', 'LoadBalancerName', 'LoadBalancerId'],
    },
    'AWS::ElasticLoadBalancingV2::TargetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):targetgroup/(?<TargetGroupName>[^/:]+)/(?<TargetGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'TargetGroupName', 'TargetGroupId'],
    },
    'AWS::ElasticLoadBalancingV2::TrustStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):elasticloadbalancing:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):truststore/(?<TrustStoreName>[^/:]+)/(?<TrustStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'TrustStoreName', 'TrustStoreId'],
    },
    'AWS::Elasticsearch::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):es:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domain/(?<DomainName>[^/:]+)',
        captureGroups: ['Account', 'DomainName'],
    },
    'AWS::EntityResolution::IdMappingWorkflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):entityresolution:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):idmappingworkflow/(?<WorkflowName>[^/:]+)',
        captureGroups: ['AccountId', 'WorkflowName'],
    },
    'AWS::EntityResolution::IdNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):entityresolution:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):idnamespace/(?<IdNamespaceName>[^/:]+)',
        captureGroups: ['AccountId', 'IdNamespaceName'],
    },
    'AWS::EntityResolution::MatchingWorkflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):entityresolution:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):matchingworkflow/(?<WorkflowName>[^/:]+)',
        captureGroups: ['AccountId', 'WorkflowName'],
    },
    'AWS::EntityResolution::SchemaMapping': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):entityresolution:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schemamapping/(?<SchemaName>[^/:]+)',
        captureGroups: ['AccountId', 'SchemaName'],
    },
    'AWS::EventSchemas::Discoverer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):schemas:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):discoverer/(?<DiscovererId>[^/:]+)',
        captureGroups: ['AccountId', 'DiscovererId'],
    },
    'AWS::EventSchemas::Registry': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):schemas:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):registry/(?<RegistryName>[^/:]+)',
        captureGroups: ['AccountId', 'RegistryName'],
    },
    'AWS::EventSchemas::Schema': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):schemas:(?<Region>[^:/]+):(?<Account>[^:/]+):schema/(?<RegistryName>[^:/]+)/(?<SchemaName>[^:/]+)',
        captureGroups: ['Account', 'RegistryName', 'SchemaName'],
    },
    'AWS::Events::ApiDestination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):api-destination/(?<ApiDestinationName>[^:]+)',
        captureGroups: ['AccountId', 'ApiDestinationName'],
    },
    'AWS::Events::Archive': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):archive/(?<ArchiveName>[^/:]+)',
        captureGroups: ['AccountId', 'ArchiveName'],
    },
    'AWS::Events::Connection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connection/(?<ConnectionName>[^:]+)',
        captureGroups: ['AccountId', 'ConnectionName'],
    },
    'AWS::Events::Endpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):endpoint/(?<EndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'EndpointName'],
    },
    'AWS::Events::EventBus': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):event-bus/(?<EventBusName>[^/:]+)',
        captureGroups: ['AccountId', 'EventBusName'],
    },
    'AWS::Events::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):events:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rule/(?:(?<EventBusName>[^/:]+)/)?(?<RuleName>[^/:]+)',
        captureGroups: ['AccountId', 'EventBusName', 'RuleName'],
    },
    'AWS::Evidently::Experiment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evidently:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[-a-zA-Z0-9._]+)/experiment/(?<ExperimentName>[-a-zA-Z0-9._]+)',
        captureGroups: ['AccountId', 'ProjectName', 'ExperimentName'],
    },
    'AWS::Evidently::Feature': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evidently:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[-a-zA-Z0-9._]+)/feature/(?<FeatureName>[-a-zA-Z0-9._]*)',
        captureGroups: ['AccountId', 'ProjectName', 'FeatureName'],
    },
    'AWS::Evidently::Launch': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evidently:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[-a-zA-Z0-9._]+)/launch/(?<LaunchName>[-a-zA-Z0-9._]+)',
        captureGroups: ['AccountId', 'ProjectName', 'LaunchName'],
    },
    'AWS::Evidently::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evidently:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[-a-zA-Z0-9._]+)',
        captureGroups: ['AccountId', 'ProjectName'],
    },
    'AWS::Evidently::Segment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):evidently:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):segment/(?<SegmentName>[^/:]+)',
        captureGroups: ['AccountId', 'SegmentName'],
    },
    'AWS::FIS::ExperimentTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):experiment-template/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::FMS::Policy': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):fms:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):policy/(?<PolicyId>[^/:]+)',
        captureGroups: ['Account', 'PolicyId'],
    },
    'AWS::FMS::ResourceSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resource-set/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::FSx::DataRepositoryAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):association/(?<FileSystemIdOrFileCacheId>[^:/]+)/(?<DataRepositoryAssociationId>[^:/]+)',
        captureGroups: ['AccountId', 'FileSystemIdOrFileCacheId', 'DataRepositoryAssociationId'],
    },
    'AWS::FSx::FileSystem': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):file-system/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FSx::Snapshot': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):snapshot/(?<VolumeId>fsvol-[0-9a-f]{17,})/(?<SnapshotId>fsvolsnap-[0-9a-f]{8,})',
        captureGroups: ['AccountId', 'VolumeId', 'SnapshotId'],
    },
    'AWS::FSx::StorageVirtualMachine': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):storage-virtual-machine/(?<FileSystemId>[^/:]+)/(?<StorageVirtualMachineId>[^/:]+)',
        captureGroups: ['AccountId', 'FileSystemId', 'StorageVirtualMachineId'],
    },
    'AWS::FSx::Volume': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):volume/(?<FileSystemId>[^/:]+)/(?<VolumeId>[^/:]+)',
        captureGroups: ['AccountId', 'FileSystemId', 'VolumeId'],
    },
    'AWS::FinSpace::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):finspace:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentId'],
    },
    'AWS::Forecast::Dataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):forecast:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Forecast::DatasetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):forecast:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset-group/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::FraudDetector::Detector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::EntityType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):entity-type/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::EventType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):event-type/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::Label': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):label/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::List': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):list/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::Outcome': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):outcome/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::FraudDetector::Variable': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):frauddetector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):variable/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::GameLift::Alias': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+)::alias/(?<AliasId>[^/:]+)',
        captureGroups: ['AliasId'],
    },
    'AWS::GameLift::Build': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):build/(?<BuildId>[^/:]+)',
        captureGroups: ['AccountId', 'BuildId'],
    },
    'AWS::GameLift::ContainerFleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):containerfleet/(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FleetId'],
    },
    'AWS::GameLift::ContainerGroupDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):containergroupdefinition/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::GameLift::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fleet/(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FleetId'],
    },
    'AWS::GameLift::GameServerGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gameservergroup/(?<GameServerGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'GameServerGroupName'],
    },
    'AWS::GameLift::GameSessionQueue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gamesessionqueue/(?<GameSessionQueueName>[^/:]+)',
        captureGroups: ['AccountId', 'GameSessionQueueName'],
    },
    'AWS::GameLift::Location': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):location/(?<LocationId>[^/:]+)',
        captureGroups: ['AccountId', 'LocationId'],
    },
    'AWS::GameLift::MatchmakingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):matchmakingconfiguration/(?<MatchmakingConfigurationName>[^/:]+)',
        captureGroups: ['AccountId', 'MatchmakingConfigurationName'],
    },
    'AWS::GameLift::MatchmakingRuleSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):matchmakingruleset/(?<MatchmakingRuleSetName>[^/:]+)',
        captureGroups: ['AccountId', 'MatchmakingRuleSetName'],
    },
    'AWS::GameLift::Script': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gamelift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):script/(?<ScriptId>[^/:]+)',
        captureGroups: ['AccountId', 'ScriptId'],
    },
    'AWS::GameLiftStreams::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gameliftstreams:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::GameLiftStreams::StreamGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):gameliftstreams:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):streamgroup/(?<StreamGroupId>[^:/]+)',
        captureGroups: ['AccountId', 'StreamGroupId'],
    },
    'AWS::GlobalAccelerator::Accelerator': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):globalaccelerator::(?<Account>[0-9]{12}):accelerator/(?<AcceleratorId>[^/:]+)',
        captureGroups: ['Account', 'AcceleratorId'],
    },
    'AWS::GlobalAccelerator::CrossAccountAttachment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):globalaccelerator::(?<AccountId>[0-9]{12}):attachment/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::GlobalAccelerator::EndpointGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):globalaccelerator::(?<Account>[0-9]{12}):accelerator/(?<AcceleratorId>[^/:]+)/listener/(?<ListenerId>[^/:]+)/endpoint-group/(?<EndpointGroupId>[^/:]+)',
        captureGroups: ['Account', 'AcceleratorId', 'ListenerId', 'EndpointGroupId'],
    },
    'AWS::GlobalAccelerator::Listener': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):globalaccelerator::(?<Account>[0-9]{12}):accelerator/(?<AcceleratorId>[^/:]+)/listener/(?<ListenerId>[^/:]+)',
        captureGroups: ['Account', 'AcceleratorId', 'ListenerId'],
    },
    'AWS::Glue::Connection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connection/(?<ConnectionName>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectionName'],
    },
    'AWS::Glue::Crawler': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):crawler/(?<CrawlerName>.+)',
        captureGroups: ['AccountId', 'CrawlerName'],
    },
    'AWS::Glue::CustomEntityType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):customEntityType/(?<CustomEntityTypeId>[^/:]+)',
        captureGroups: ['AccountId', 'CustomEntityTypeId'],
    },
    'AWS::Glue::DataQualityRuleset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataQualityRuleset/(?<RulesetName>[^/:]+)',
        captureGroups: ['AccountId', 'RulesetName'],
    },
    'AWS::Glue::Database': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):database/(?<DatabaseName>.+)',
        captureGroups: ['AccountId', 'DatabaseName'],
    },
    'AWS::Glue::DevEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):devEndpoint/(?<DevEndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'DevEndpointName'],
    },
    'AWS::Glue::Integration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):integration:(?<IntegrationId>[^/:]+)',
        captureGroups: ['AccountId', 'IntegrationId'],
    },
    'AWS::Glue::IntegrationResourceProperty': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):integrationresourceproperty/(?<ResourceType>[^:/]+)/(?<ResourceName>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceType', 'ResourceName'],
    },
    'AWS::Glue::Job': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):job/(?<JobName>.+)',
        captureGroups: ['AccountId', 'JobName'],
    },
    'AWS::Glue::MLTransform': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mlTransform/(?<TransformId>[^/:]+)',
        captureGroups: ['AccountId', 'TransformId'],
    },
    'AWS::Glue::Partition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):partition/(?<PartitionName>[^/:]+)',
        captureGroups: ['AccountId', 'PartitionName'],
    },
    'AWS::Glue::Registry': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):registry/(?<RegistryName>[^/:]+)',
        captureGroups: ['AccountId', 'RegistryName'],
    },
    'AWS::Glue::Schema': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schema/(?<RegistryName>[^/:]+)/(?<SchemaName>[^/:]+)',
        captureGroups: ['AccountId', 'RegistryName', 'SchemaName'],
    },
    'AWS::Glue::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):table/(?<DatabaseName>[^/:]+)/(?<TableName>[^/:]+)',
        captureGroups: ['AccountId', 'DatabaseName', 'TableName'],
    },
    'AWS::Glue::Trigger': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):trigger/(?<TriggerName>.+)',
        captureGroups: ['AccountId', 'TriggerName'],
    },
    'AWS::Glue::UsageProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):usageProfile/(?<UsageProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'UsageProfileId'],
    },
    'AWS::Glue::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<WorkflowName>[^/:]+)',
        captureGroups: ['AccountId', 'WorkflowName'],
    },
    'AWS::Grafana::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):grafana:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/workspaces/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Greengrass::ConnectorDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/connectors/(?<ConnectorDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorDefinitionId'],
    },
    'AWS::Greengrass::ConnectorDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/connectors/(?<ConnectorDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::CoreDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/cores/(?<CoreDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'CoreDefinitionId'],
    },
    'AWS::Greengrass::CoreDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/cores/(?<CoreDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'CoreDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::DeviceDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/devices/(?<DeviceDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceDefinitionId'],
    },
    'AWS::Greengrass::DeviceDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/devices/(?<DeviceDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::FunctionDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/functions/(?<FunctionDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'FunctionDefinitionId'],
    },
    'AWS::Greengrass::FunctionDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/functions/(?<FunctionDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'FunctionDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::Group': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/groups/(?<GroupId>[^/:]+)',
        captureGroups: ['AccountId', 'GroupId'],
    },
    'AWS::Greengrass::GroupVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/groups/(?<GroupId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'GroupId', 'VersionId'],
    },
    'AWS::Greengrass::LoggerDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/loggers/(?<LoggerDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'LoggerDefinitionId'],
    },
    'AWS::Greengrass::LoggerDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/loggers/(?<LoggerDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'LoggerDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::ResourceDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/resources/(?<ResourceDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceDefinitionId'],
    },
    'AWS::Greengrass::ResourceDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/resources/(?<ResourceDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceDefinitionId', 'VersionId'],
    },
    'AWS::Greengrass::SubscriptionDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/subscriptions/(?<SubscriptionDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'SubscriptionDefinitionId'],
    },
    'AWS::Greengrass::SubscriptionDefinitionVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/subscriptions/(?<SubscriptionDefinitionId>[^/:]+)/versions/(?<VersionId>[^/:]+)',
        captureGroups: ['AccountId', 'SubscriptionDefinitionId', 'VersionId'],
    },
    'AWS::GreengrassV2::ComponentVersion': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):components:(?<ComponentName>[a-zA-Z0-9-_.]+):versions:(?<ComponentVersion>[0-9a-zA-Z-.+]+)',
        captureGroups: ['Account', 'ComponentName', 'ComponentVersion'],
    },
    'AWS::GreengrassV2::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deployments:(?<DeploymentId>[^/:]+)',
        captureGroups: ['AccountId', 'DeploymentId'],
    },
    'AWS::GroundStation::Config': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):groundstation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):config/(?<ConfigType>[^/:]+)/(?<ConfigId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigType', 'ConfigId'],
    },
    'AWS::GroundStation::DataflowEndpointGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):groundstation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataflow-endpoint-group/(?<DataflowEndpointGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'DataflowEndpointGroupId'],
    },
    'AWS::GroundStation::MissionProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):groundstation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mission-profile/(?<MissionProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'MissionProfileId'],
    },
    'AWS::GuardDuty::Detector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId'],
    },
    'AWS::GuardDuty::Filter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/filter/(?<FilterName>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'FilterName'],
    },
    'AWS::GuardDuty::IPSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/ipset/(?<IPSetId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'IPSetId'],
    },
    'AWS::GuardDuty::MalwareProtectionPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):malware-protection-plan/(?<MalwareProtectionPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'MalwareProtectionPlanId'],
    },
    'AWS::GuardDuty::PublishingDestination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/publishingdestination/(?<PublishingDestinationId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'PublishingDestinationId'],
    },
    'AWS::GuardDuty::ThreatEntitySet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/threatentityset/(?<ThreatEntitySetId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'ThreatEntitySetId'],
    },
    'AWS::GuardDuty::ThreatIntelSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/threatintelset/(?<ThreatIntelSetId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'ThreatIntelSetId'],
    },
    'AWS::GuardDuty::TrustedEntitySet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/trustedentityset/(?<TrustedEntitySetId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'TrustedEntitySetId'],
    },
    'AWS::HealthImaging::Datastore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medical-imaging:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):datastore/(?<DatastoreId>[^:/]+)',
        captureGroups: ['AccountId', 'DatastoreId'],
    },
    'AWS::HealthLake::FHIRDatastore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):healthlake:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):datastore/fhir/(?<DatastoreId>[^/:]+)',
        captureGroups: ['AccountId', 'DatastoreId'],
    },
    'AWS::IAM::Group': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):group/(?<GroupNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'GroupNameWithPath'],
    },
    'AWS::IAM::InstanceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):instance-profile/(?<InstanceProfileNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'InstanceProfileNameWithPath'],
    },
    'AWS::IAM::OIDCProvider': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):oidc-provider/(?<OidcProviderName>[^:]+)',
        captureGroups: ['AccountId', 'OidcProviderName'],
    },
    'AWS::IAM::Policy': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>aws|[0-9]{12}):policy/(?<PolicyNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'PolicyNameWithPath'],
    },
    'AWS::IAM::Role': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):role/(?<RoleNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'RoleNameWithPath'],
    },
    'AWS::IAM::SAMLProvider': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):saml-provider/(?<SamlProviderName>[^/:]+)',
        captureGroups: ['AccountId', 'SamlProviderName'],
    },
    'AWS::IAM::ServerCertificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):server-certificate/(?<CertificateNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'CertificateNameWithPath'],
    },
    'AWS::IAM::User': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):user/(?<UserNameWithPath>[^:]+)',
        captureGroups: ['AccountId', 'UserNameWithPath'],
    },
    'AWS::IAM::VirtualMFADevice': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):iam::(?<AccountId>[0-9]{12}):mfa/(?<MfaTokenIdWithPath>[^:]+)',
        captureGroups: ['AccountId', 'MfaTokenIdWithPath'],
    },
    'AWS::IVS::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::EncoderConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):encoder-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::IngestConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ingest-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::PlaybackKeyPair': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):playback-key/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::PlaybackRestrictionPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):playback-restriction-policy/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::PublicKey': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):public-key/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::RecordingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):recording-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::Stage': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stage/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::StorageConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):storage-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVS::StreamKey': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stream-key/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVSChat::LoggingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivschat:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):logging-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IVSChat::Room': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivschat:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):room/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::IdentityStore::Group': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):identitystore:::group/(?<GroupId>[^/:]+)',
        captureGroups: ['GroupId'],
    },
    'AWS::IdentityStore::GroupMembership': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):identitystore:::membership/(?<MembershipId>[^/:]+)',
        captureGroups: ['MembershipId'],
    },
    'AWS::ImageBuilder::Component': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):component/(?<ComponentName>[^/:]+)/(?<ComponentVersion>[^/:]+)/(?<ComponentBuildVersion>[^/:]+)',
        captureGroups: ['AccountId', 'ComponentName', 'ComponentVersion', 'ComponentBuildVersion'],
    },
    'AWS::ImageBuilder::ContainerRecipe': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):container-recipe/(?<ContainerRecipeName>[^/:]+)/(?<ContainerRecipeVersion>[^/:]+)',
        captureGroups: ['AccountId', 'ContainerRecipeName', 'ContainerRecipeVersion'],
    },
    'AWS::ImageBuilder::DistributionConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):distribution-configuration/(?<DistributionConfigurationName>[^/:]+)',
        captureGroups: ['AccountId', 'DistributionConfigurationName'],
    },
    'AWS::ImageBuilder::Image': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image/(?<ImageName>[^/:]+)/(?<ImageVersion>[^/:]+)/(?<ImageBuildVersion>[^/:]+)',
        captureGroups: ['AccountId', 'ImageName', 'ImageVersion', 'ImageBuildVersion'],
    },
    'AWS::ImageBuilder::ImagePipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image-pipeline/(?<ImagePipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'ImagePipelineName'],
    },
    'AWS::ImageBuilder::ImageRecipe': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image-recipe/(?<ImageRecipeName>[^/:]+)/(?<ImageRecipeVersion>[^/:]+)',
        captureGroups: ['AccountId', 'ImageRecipeName', 'ImageRecipeVersion'],
    },
    'AWS::ImageBuilder::InfrastructureConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):infrastructure-configuration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::ImageBuilder::LifecyclePolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):lifecycle-policy/(?<LifecyclePolicyName>[^/:]+)',
        captureGroups: ['AccountId', 'LifecyclePolicyName'],
    },
    'AWS::ImageBuilder::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):imagebuilder:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<WorkflowType>[^/:]+)/(?<WorkflowName>[^/:]+)/(?<WorkflowVersion>[^/:]+)/(?<WorkflowBuildVersion>[^/:]+)',
        captureGroups: ['AccountId', 'WorkflowType', 'WorkflowName', 'WorkflowVersion', 'WorkflowBuildVersion'],
    },
    'AWS::Inspector::AssessmentTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):inspector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):target/(?<TargetID>[^/:]+)/template/(?<TemplateID>[^/:]+)',
        captureGroups: ['AccountId', 'TargetID', 'TemplateID'],
    },
    'AWS::InspectorV2::CisScanConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):inspector2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):owner/(?<OwnerId>[^:/]+)/cis-configuration/(?<CISScanConfigurationId>[^:/]+)',
        captureGroups: ['AccountId', 'OwnerId', 'CISScanConfigurationId'],
    },
    'AWS::InspectorV2::Filter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):inspector2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):owner/(?<OwnerId>[^:/]+)/filter/(?<FilterId>[^:/]+)',
        captureGroups: ['AccountId', 'OwnerId', 'FilterId'],
    },
    'AWS::InternetMonitor::Monitor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):internetmonitor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):monitor/(?<MonitorName>[^/:]+)',
        captureGroups: ['AccountId', 'MonitorName'],
    },
    'AWS::Invoicing::InvoiceUnit': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):invoicing::(?<AccountId>[0-9]{12}):invoice-unit/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::IoT::Authorizer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):authorizer/(?<AuthorizerName>[\\w=,@-]{1,128})',
        captureGroups: ['AccountId', 'AuthorizerName'],
    },
    'AWS::IoT::BillingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):billinggroup/(?<BillingGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'BillingGroupName'],
    },
    'AWS::IoT::CACertificate': {
        arnRegex: 'arn:(?<Partition>[^:/]+):iot:(?<Region>[^:/]+):(?<Account>[^:/]+):cacert/(?<CACertificate>[^:/]+)',
        captureGroups: ['Account', 'CACertificate'],
    },
    'AWS::IoT::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cert/(?<CertificateId>(0x)?[a-fA-F0-9]{64})',
        captureGroups: ['AccountId', 'CertificateId'],
    },
    'AWS::IoT::CertificateProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificateprovider/(?<CertificateProviderName>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateProviderName'],
    },
    'AWS::IoT::Command': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):command/(?<CommandId>[^/:]+)',
        captureGroups: ['AccountId', 'CommandId'],
    },
    'AWS::IoT::CustomMetric': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):custommetric/(?<MetricName>[a-zA-Z0-9:_-]+)',
        captureGroups: ['Account', 'MetricName'],
    },
    'AWS::IoT::Dimension': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):dimension/(?<DimensionName>[a-zA-Z0-9:_-]+)',
        captureGroups: ['Account', 'DimensionName'],
    },
    'AWS::IoT::DomainConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domainconfiguration/(?<DomainConfigurationName>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'DomainConfigurationName', 'Id'],
    },
    'AWS::IoT::FleetMetric': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):fleetmetric/(?<FleetMetricName>[a-zA-Z0-9:_-]+)',
        captureGroups: ['Account', 'FleetMetricName'],
    },
    'AWS::IoT::JobTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):jobtemplate/(?<JobTemplateId>[a-zA-Z0-9_-]{1,64})',
        captureGroups: ['Account', 'JobTemplateId'],
    },
    'AWS::IoT::MitigationAction': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):mitigationaction/(?<MitigationActionName>[a-zA-Z0-9_-]+)',
        captureGroups: ['Account', 'MitigationActionName'],
    },
    'AWS::IoT::Policy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):policy/(?<PolicyName>[\\w+=,.@-]{1,128})',
        captureGroups: ['AccountId', 'PolicyName'],
    },
    'AWS::IoT::ProvisioningTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):provisioningtemplate/(?<TemplateName>[0-9A-Za-z_-]{1,36})',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::IoT::RoleAlias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):rolealias/(?<RoleAlias>[\\w=,@-]{1,128})',
        captureGroups: ['Account', 'RoleAlias'],
    },
    'AWS::IoT::ScheduledAudit': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):scheduledaudit/(?<ScheduledAuditName>[a-zA-Z0-9_-]+)',
        captureGroups: ['Account', 'ScheduledAuditName'],
    },
    'AWS::IoT::SecurityProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):securityprofile/(?<SecurityProfileName>[a-zA-Z0-9:_-]+)',
        captureGroups: ['Account', 'SecurityProfileName'],
    },
    'AWS::IoT::SoftwarePackage': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):package/(?<PackageName>[^:/]+)',
        captureGroups: ['AccountId', 'PackageName'],
    },
    'AWS::IoT::SoftwarePackageVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):package/(?<PackageName>[^:/]+)/version/(?<VersionName>[^:/]+)',
        captureGroups: ['AccountId', 'PackageName', 'VersionName'],
    },
    'AWS::IoT::Thing': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):thing/(?<ThingName>[a-zA-Z0-9-]+)',
        captureGroups: ['AccountId', 'ThingName'],
    },
    'AWS::IoT::ThingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):thinggroup/(?<ThingGroupName>[a-zA-Z0-9:_-]+)',
        captureGroups: ['AccountId', 'ThingGroupName'],
    },
    'AWS::IoT::ThingType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):thingtype/(?<ThingTypeName>[^/:]+)',
        captureGroups: ['AccountId', 'ThingTypeName'],
    },
    'AWS::IoT::TopicRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rule/(?<RuleName>[^/:]+)',
        captureGroups: ['AccountId', 'RuleName'],
    },
    'AWS::IoT::TopicRuleDestination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iot:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ruledestination/(?<DestinationType>(http|vpc))/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'DestinationType', 'UUID'],
    },
    'AWS::IoTAnalytics::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel/(?<ChannelName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelName'],
    },
    'AWS::IoTAnalytics::Dataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<DatasetName>[^/:]+)',
        captureGroups: ['AccountId', 'DatasetName'],
    },
    'AWS::IoTAnalytics::Datastore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):datastore/(?<DatastoreName>[^/:]+)',
        captureGroups: ['AccountId', 'DatastoreName'],
    },
    'AWS::IoTAnalytics::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipeline/(?<PipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineName'],
    },
    'AWS::IoTCoreDeviceAdvisor::SuiteDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotdeviceadvisor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):suitedefinition/(?<SuiteDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'SuiteDefinitionId'],
    },
    'AWS::IoTEvents::AlarmModel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotevents:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):alarmModel/(?<AlarmModelName>[^/:]+)',
        captureGroups: ['AccountId', 'AlarmModelName'],
    },
    'AWS::IoTEvents::DetectorModel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotevents:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detectorModel/(?<DetectorModelName>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorModelName'],
    },
    'AWS::IoTEvents::Input': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotevents:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):input/(?<InputName>[^/:]+)',
        captureGroups: ['AccountId', 'InputName'],
    },
    'AWS::IoTFleetWise::Campaign': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):campaign/(?<CampaignName>[^/:]+)',
        captureGroups: ['AccountId', 'CampaignName'],
    },
    'AWS::IoTFleetWise::DecoderManifest': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):decoder-manifest/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::IoTFleetWise::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):fleet/(?<FleetId>[^/:]+)',
        captureGroups: ['AccountId', 'FleetId'],
    },
    'AWS::IoTFleetWise::ModelManifest': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-manifest/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::IoTFleetWise::SignalCatalog': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):signal-catalog/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::IoTFleetWise::StateTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):state-template/(?<StateTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'StateTemplateId'],
    },
    'AWS::IoTFleetWise::Vehicle': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vehicle/(?<VehicleId>[^/:]+)',
        captureGroups: ['AccountId', 'VehicleId'],
    },
    'AWS::IoTManagedIntegrations::CredentialLocker': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotmanagedintegrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):credential-locker/(?<Identifier>[^:/]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::IoTManagedIntegrations::ManagedThing': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotmanagedintegrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):managed-thing/(?<Identifier>[^:/]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::IoTManagedIntegrations::ProvisioningProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotmanagedintegrations:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):provisioning-profile/(?<Identifier>[^:/]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::IoTSiteWise::AccessPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-policy/(?<AccessPolicyId>[^/:]+)',
        captureGroups: ['AccountId', 'AccessPolicyId'],
    },
    'AWS::IoTSiteWise::Asset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):asset/(?<AssetId>[^/:]+)',
        captureGroups: ['AccountId', 'AssetId'],
    },
    'AWS::IoTSiteWise::AssetModel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):asset-model/(?<AssetModelId>[^/:]+)',
        captureGroups: ['AccountId', 'AssetModelId'],
    },
    'AWS::IoTSiteWise::ComputationModel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):computation-model/(?<ComputationModelId>[^/:]+)',
        captureGroups: ['AccountId', 'ComputationModelId'],
    },
    'AWS::IoTSiteWise::Dashboard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dashboard/(?<DashboardId>[^/:]+)',
        captureGroups: ['AccountId', 'DashboardId'],
    },
    'AWS::IoTSiteWise::Dataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<DatasetId>[^/:]+)',
        captureGroups: ['AccountId', 'DatasetId'],
    },
    'AWS::IoTSiteWise::Gateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId'],
    },
    'AWS::IoTSiteWise::Portal': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):portal/(?<PortalId>[^/:]+)',
        captureGroups: ['AccountId', 'PortalId'],
    },
    'AWS::IoTSiteWise::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectId>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectId'],
    },
    'AWS::IoTTwinMaker::ComponentType': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iottwinmaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)/component-type/(?<ComponentTypeId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'ComponentTypeId'],
    },
    'AWS::IoTTwinMaker::Entity': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iottwinmaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)/entity/(?<EntityId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'EntityId'],
    },
    'AWS::IoTTwinMaker::Scene': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iottwinmaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)/scene/(?<SceneId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'SceneId'],
    },
    'AWS::IoTTwinMaker::SyncJob': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iottwinmaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)/sync-job/(?<SyncJobId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'SyncJobId'],
    },
    'AWS::IoTTwinMaker::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iottwinmaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId'],
    },
    'AWS::IoTWireless::Destination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Destination/(?<DestinationName>[^/:]+)',
        captureGroups: ['AccountId', 'DestinationName'],
    },
    'AWS::IoTWireless::DeviceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):DeviceProfile/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::IoTWireless::FuotaTask': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):FuotaTask/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::IoTWireless::MulticastGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):MulticastGroup/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::IoTWireless::NetworkAnalyzerConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):NetworkAnalyzerConfiguration/(?<NetworkAnalyzerConfigurationName>[^/:]+)',
        captureGroups: ['AccountId', 'NetworkAnalyzerConfigurationName'],
    },
    'AWS::IoTWireless::PartnerAccount': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):SidewalkAccount/(?<AmazonId>[^/:]+)',
        captureGroups: ['AccountId', 'AmazonId'],
    },
    'AWS::IoTWireless::ServiceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ServiceProfile/(?<ServiceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceProfileId'],
    },
    'AWS::IoTWireless::TaskDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):WirelessGatewayTaskDefinition/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::IoTWireless::WirelessDevice': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):WirelessDevice/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::IoTWireless::WirelessDeviceImportTask': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ImportTask/(?<ImportTaskId>[^:/]+)',
        captureGroups: ['AccountId', 'ImportTaskId'],
    },
    'AWS::IoTWireless::WirelessGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):WirelessGateway/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::KMS::Alias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):alias/(?<Alias>[-a-zA-Z0-9/_]+)',
        captureGroups: ['AccountId', 'Alias'],
    },
    'AWS::KMS::Key': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):kms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):key/(?<KeyId>[^/:]+)',
        captureGroups: ['AccountId', 'KeyId'],
    },
    'AWS::KafkaConnect::Connector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafkaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorName>[^/:]+)/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorName', 'UUID'],
    },
    'AWS::KafkaConnect::CustomPlugin': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafkaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):custom-plugin/(?<CustomPluginName>[^:/]+)/(?<UUID>[^:/]+)',
        captureGroups: ['AccountId', 'CustomPluginName', 'UUID'],
    },
    'AWS::KafkaConnect::WorkerConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafkaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):worker-configuration/(?<WorkerConfigurationName>[^:/]+)/(?<UUID>[^:/]+)',
        captureGroups: ['AccountId', 'WorkerConfigurationName', 'UUID'],
    },
    'AWS::Kendra::DataSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kendra:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):index/(?<IndexId>[^/:]+)/data-source/(?<DataSourceId>[^/:]+)',
        captureGroups: ['AccountId', 'IndexId', 'DataSourceId'],
    },
    'AWS::Kendra::Faq': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kendra:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):index/(?<IndexId>[^/:]+)/faq/(?<FaqId>[^/:]+)',
        captureGroups: ['AccountId', 'IndexId', 'FaqId'],
    },
    'AWS::Kendra::Index': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kendra:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):index/(?<IndexId>[^/:]+)',
        captureGroups: ['AccountId', 'IndexId'],
    },
    'AWS::KendraRanking::ExecutionPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kendra-ranking:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rescore-execution-plan/(?<RescoreExecutionPlanId>[^:/]+)',
        captureGroups: ['AccountId', 'RescoreExecutionPlanId'],
    },
    'AWS::Kinesis::Stream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stream/(?<StreamName>[^/:]+)',
        captureGroups: ['AccountId', 'StreamName'],
    },
    'AWS::Kinesis::StreamConsumer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<StreamType>[^:/]+)/(?<StreamName>[^:/]+)/consumer/(?<ConsumerName>[^:/]+):(?<ConsumerCreationTimpstamp>[^:/]+)',
        captureGroups: ['AccountId', 'StreamType', 'StreamName', 'ConsumerName', 'ConsumerCreationTimpstamp'],
    },
    'AWS::KinesisAnalytics::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesisanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName'],
    },
    'AWS::KinesisAnalyticsV2::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesisanalytics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationName>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName'],
    },
    'AWS::KinesisFirehose::DeliveryStream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):firehose:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deliverystream/(?<DeliveryStreamName>[^/:]+)',
        captureGroups: ['AccountId', 'DeliveryStreamName'],
    },
    'AWS::KinesisVideo::SignalingChannel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesisvideo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel/(?<ChannelName>[^/:]+)/(?<CreationTime>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelName', 'CreationTime'],
    },
    'AWS::KinesisVideo::Stream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesisvideo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stream/(?<StreamName>[^/:]+)/(?<CreationTime>[^/:]+)',
        captureGroups: ['AccountId', 'StreamName', 'CreationTime'],
    },
    'AWS::Lambda::Alias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):function:(?<FunctionName>[^/:]+):(?<AliasName>(?![0-9].*$)([a-zA-Z0-9-_]+))',
        captureGroups: ['AccountId', 'FunctionName', 'AliasName'],
    },
    'AWS::Lambda::CapacityProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):capacity-provider:(?<CapacityProviderName>[^/:]+)',
        captureGroups: ['AccountId', 'CapacityProviderName'],
    },
    'AWS::Lambda::CodeSigningConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):code-signing-config:(?<CodeSigningConfigId>[^:/]+)',
        captureGroups: ['AccountId', 'CodeSigningConfigId'],
    },
    'AWS::Lambda::EventSourceMapping': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):event-source-mapping:(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'UUID'],
    },
    'AWS::Lambda::Function': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):function:(?<FunctionName>[^/:]+)',
        captureGroups: ['AccountId', 'FunctionName'],
    },
    'AWS::Lambda::LayerVersion': {
        arnRegex:
            'arn:(?<Partition>[a-zA-Z0-9-]+):lambda:(?<Region>[a-zA-Z0-9-]+):(?<Account>\\d{12}):layer:(?<LayerName>[a-zA-Z0-9-_]+):(?<LayerVersion>[0-9]+)',
        captureGroups: ['Account', 'LayerName', 'LayerVersion'],
    },
    'AWS::Lambda::Version': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):function:(?<FunctionName>[^\\/:]+):(?<VersionNumber>(\\$LATEST|[0-9]+))',
        captureGroups: ['AccountId', 'FunctionName', 'VersionNumber'],
    },
    'AWS::LaunchWizard::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):launchwizard:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deployment/(?<DeploymentId>[^/:]+)',
        captureGroups: ['AccountId', 'DeploymentId'],
    },
    'AWS::Lex::Bot': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):lex:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bot:(?<BotName>[^/:]+)',
        captureGroups: ['AccountId', 'BotName'],
    },
    'AWS::Lex::BotAlias': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):lex:(?<Region>[^:/]+):(?<Account>[^:/]+):bot-alias/(?<BotId>[^:/]+)/(?<BotAliasId>[^:/]+)',
        captureGroups: ['Account', 'BotId', 'BotAliasId'],
    },
    'AWS::Lex::BotVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lex:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bot:(?<BotName>[^:/]+):(?<BotVersion>[^:/]+)',
        captureGroups: ['AccountId', 'BotName', 'BotVersion'],
    },
    'AWS::LicenseManager::Grant': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):license-manager::(?<AccountId>[0-9]{12}):grant:(?<GrantId>[^/:]+)',
        captureGroups: ['AccountId', 'GrantId'],
    },
    'AWS::LicenseManager::License': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):license-manager::(?<AccountId>[0-9]{12}):license:(?<LicenseId>[^/:]+)',
        captureGroups: ['AccountId', 'LicenseId'],
    },
    'AWS::Lightsail::Alarm': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Alarm/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Bucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Bucket/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Certificate/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Container': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ContainerService/(?<Id>[^:/]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Database': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):RelationalDatabase/(?<Id>[^:/]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Disk': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Disk/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::DiskSnapshot': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):DiskSnapshot/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Distribution': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Distribution/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Domain/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::Instance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):Instance/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::InstanceSnapshot': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):InstanceSnapshot/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::LoadBalancer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):LoadBalancer/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::LoadBalancerTlsCertificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):LoadBalancerTlsCertificate/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Lightsail::StaticIp': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lightsail:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):StaticIp/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Location::APIKey': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):api-key/(?<KeyName>[^:/]+)',
        captureGroups: ['AccountId', 'KeyName'],
    },
    'AWS::Location::GeofenceCollection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):geofence-collection/(?<CollectionName>[^/:]+)',
        captureGroups: ['AccountId', 'CollectionName'],
    },
    'AWS::Location::Map': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):map/(?<MapName>[^/:]+)',
        captureGroups: ['AccountId', 'MapName'],
    },
    'AWS::Location::PlaceIndex': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):place-index/(?<IndexName>[^/:]+)',
        captureGroups: ['AccountId', 'IndexName'],
    },
    'AWS::Location::RouteCalculator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):route-calculator/(?<CalculatorName>[^/:]+)',
        captureGroups: ['AccountId', 'CalculatorName'],
    },
    'AWS::Location::Tracker': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):geo:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):tracker/(?<TrackerName>[^/:]+)',
        captureGroups: ['AccountId', 'TrackerName'],
    },
    'AWS::Logs::Delivery': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):delivery:(?<DeliveryName>[^/:]+)',
        captureGroups: ['AccountId', 'DeliveryName'],
    },
    'AWS::Logs::DeliveryDestination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):delivery-destination:(?<DeliveryDestinationName>[^/:]+)',
        captureGroups: ['AccountId', 'DeliveryDestinationName'],
    },
    'AWS::Logs::DeliverySource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):delivery-source:(?<DeliverySourceName>[^/:]+)',
        captureGroups: ['AccountId', 'DeliverySourceName'],
    },
    'AWS::Logs::Destination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):destination:(?<DestinationName>[^:*]+)',
        captureGroups: ['AccountId', 'DestinationName'],
    },
    'AWS::Logs::LogAnomalyDetector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):anomaly-detector:(?<DetectorId>[^:/]+)',
        captureGroups: ['AccountId', 'DetectorId'],
    },
    'AWS::Logs::LogGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):log-group:(?<LogGroupName>[^:]+)',
        captureGroups: ['AccountId', 'LogGroupName'],
    },
    'AWS::Logs::LogStream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):log-group:(?<LogGroupName>[^/:]+):log-stream:(?<LogStreamName>[^/:]+)',
        captureGroups: ['AccountId', 'LogGroupName', 'LogStreamName'],
    },
    'AWS::Logs::ScheduledQuery': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):scheduled-query:(?<ScheduledQueryId>[^:/]+)',
        captureGroups: ['AccountId', 'ScheduledQueryId'],
    },
    'AWS::LookoutEquipment::InferenceScheduler': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lookoutequipment:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):inference-scheduler/(?<InferenceSchedulerName>[^/:]+)/(?<InferenceSchedulerId>[^/:]+)',
        captureGroups: ['AccountId', 'InferenceSchedulerName', 'InferenceSchedulerId'],
    },
    'AWS::LookoutVision::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):lookoutvision:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName'],
    },
    'AWS::M2::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):m2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app/(?<ApplicationId>[^:/]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::M2::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):m2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):env/(?<EnvironmentId>[^:/]+)',
        captureGroups: ['AccountId', 'EnvironmentId'],
    },
    'AWS::MPA::ApprovalTeam': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mpa:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):approval-team/(?<ApprovalTeamId>[^/:]+)',
        captureGroups: ['AccountId', 'ApprovalTeamId'],
    },
    'AWS::MPA::IdentitySource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mpa:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):identity-source/(?<IdentitySourceId>[^/:]+)',
        captureGroups: ['AccountId', 'IdentitySourceId'],
    },
    'AWS::MSK::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafka:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterName>[^/:]+)/(?<RandomId>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName', 'RandomId'],
    },
    'AWS::MSK::Configuration': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):kafka:(?<Region>[^:/]+):(?<Account>[^:/]+):configuration/(?<ConfigurationName>[^:/]+)/(?<Uuid>[^:/]+)',
        captureGroups: ['Account', 'ConfigurationName', 'Uuid'],
    },
    'AWS::MSK::Replicator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafka:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):replicator/(?<ReplicatorName>[^:/]+)/(?<Uuid>[^:/]+)',
        captureGroups: ['AccountId', 'ReplicatorName', 'Uuid'],
    },
    'AWS::MSK::Topic': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafka:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):topic/(?<ClusterName>[^:/]+)/(?<ClusterUuid>[^:/]+)/(?<TopicName>[^:/]+)',
        captureGroups: ['AccountId', 'ClusterName', 'ClusterUuid', 'TopicName'],
    },
    'AWS::MSK::VpcConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kafka:(?<Region>[a-z0-9-]+):(?<VpcOwnerAccount>[^:/]+):vpc-connection/(?<ClusterOwnerAccount>[^:/]+)/(?<ClusterName>[^:/]+)/(?<Uuid>[^:/]+)',
        captureGroups: ['VpcOwnerAccount', 'ClusterOwnerAccount', 'ClusterName', 'Uuid'],
    },
    'AWS::MWAA::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):airflow:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentName>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentName'],
    },
    'AWS::MWAAServerless::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):airflow-serverless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<WorkflowId>[^:/]+)',
        captureGroups: ['AccountId', 'WorkflowId'],
    },
    'AWS::Macie::AllowList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):macie2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):allow-list/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Macie::CustomDataIdentifier': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):macie2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):custom-data-identifier/(?<ResourceId>[^/:]+)',
        captureGroups: ['Account', 'ResourceId'],
    },
    'AWS::Macie::FindingsFilter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):macie2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):findings-filter/(?<ResourceId>[^/:]+)',
        captureGroups: ['Account', 'ResourceId'],
    },
    'AWS::ManagedBlockchain::Accessor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):managedblockchain:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):accessors/(?<AccessorId>[^/:]+)',
        captureGroups: ['AccountId', 'AccessorId'],
    },
    'AWS::ManagedBlockchain::Member': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):managedblockchain:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):members/(?<MemberId>[^/:]+)',
        captureGroups: ['AccountId', 'MemberId'],
    },
    'AWS::ManagedBlockchain::Node': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):managedblockchain:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):nodes/(?<NodeId>[^/:]+)',
        captureGroups: ['AccountId', 'NodeId'],
    },
    'AWS::MediaConnect::Bridge': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bridge:(?<BridgeId>[^/:]+):(?<BridgeName>[^/:]+)',
        captureGroups: ['AccountId', 'BridgeId', 'BridgeName'],
    },
    'AWS::MediaConnect::Flow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):flow:(?<FlowId>[^/:]+):(?<FlowName>[^/:]+)',
        captureGroups: ['AccountId', 'FlowId', 'FlowName'],
    },
    'AWS::MediaConnect::FlowEntitlement': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):entitlement:(?<FlowId>[^/:]+):(?<EntitlementName>[^/:]+)',
        captureGroups: ['AccountId', 'FlowId', 'EntitlementName'],
    },
    'AWS::MediaConnect::FlowOutput': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):mediaconnect:(?<Region>[^:/]+):(?<Account>[^:/]+):output:(?<OutputId>[^:/]+):(?<OutputName>[^:/]+)',
        captureGroups: ['Account', 'OutputId', 'OutputName'],
    },
    'AWS::MediaConnect::FlowSource': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):mediaconnect:(?<Region>[^:/]+):(?<Account>[^:/]+):source:(?<SourceId>[^:/]+):(?<SourceName>[^:/]+)',
        captureGroups: ['Account', 'SourceId', 'SourceName'],
    },
    'AWS::MediaConnect::Gateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway:(?<GatewayId>[^/:]+):(?<GatewayName>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId', 'GatewayName'],
    },
    'AWS::MediaConnect::RouterInput': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):routerInput:(?<RouterInputId>[^/:]+)',
        captureGroups: ['AccountId', 'RouterInputId'],
    },
    'AWS::MediaConnect::RouterNetworkInterface': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):routerNetworkInterface:(?<RouterNetworkInterfaceId>[^/:]+)',
        captureGroups: ['AccountId', 'RouterNetworkInterfaceId'],
    },
    'AWS::MediaConnect::RouterOutput': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconnect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):routerOutput:(?<RouterOutputId>[^/:]+)',
        captureGroups: ['AccountId', 'RouterOutputId'],
    },
    'AWS::MediaConvert::JobTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconvert:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):jobTemplates/(?<JobTemplateName>[^/:]+)',
        captureGroups: ['AccountId', 'JobTemplateName'],
    },
    'AWS::MediaConvert::Preset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconvert:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):presets/(?<PresetName>[^/:]+)',
        captureGroups: ['AccountId', 'PresetName'],
    },
    'AWS::MediaConvert::Queue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediaconvert:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):queues/(?<QueueName>[^/:]+)',
        captureGroups: ['AccountId', 'QueueName'],
    },
    'AWS::MediaLive::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel:(?<ChannelId>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelId'],
    },
    'AWS::MediaLive::ChannelPlacementGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelPlacementGroup:(?<ClusterId>[^/:]+)/(?<ChannelPlacementGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterId', 'ChannelPlacementGroupId'],
    },
    'AWS::MediaLive::CloudWatchAlarmTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cloudwatch-alarm-template:(?<CloudWatchAlarmTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'CloudWatchAlarmTemplateId'],
    },
    'AWS::MediaLive::CloudWatchAlarmTemplateGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cloudwatch-alarm-template-group:(?<CloudWatchAlarmTemplateGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'CloudWatchAlarmTemplateGroupId'],
    },
    'AWS::MediaLive::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<ClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterId'],
    },
    'AWS::MediaLive::EventBridgeRuleTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):eventbridge-rule-template:(?<EventBridgeRuleTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'EventBridgeRuleTemplateId'],
    },
    'AWS::MediaLive::EventBridgeRuleTemplateGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):eventbridge-rule-template-group:(?<EventBridgeRuleTemplateGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'EventBridgeRuleTemplateGroupId'],
    },
    'AWS::MediaLive::Input': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):input:(?<InputId>[^/:]+)',
        captureGroups: ['AccountId', 'InputId'],
    },
    'AWS::MediaLive::InputSecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):inputSecurityGroup:(?<InputSecurityGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'InputSecurityGroupId'],
    },
    'AWS::MediaLive::Multiplex': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):multiplex:(?<MultiplexId>[^/:]+)',
        captureGroups: ['AccountId', 'MultiplexId'],
    },
    'AWS::MediaLive::Network': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):network:(?<NetworkId>[^/:]+)',
        captureGroups: ['AccountId', 'NetworkId'],
    },
    'AWS::MediaLive::SdiSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sdiSource:(?<SdiSourceId>[^/:]+)',
        captureGroups: ['AccountId', 'SdiSourceId'],
    },
    'AWS::MediaLive::SignalMap': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):medialive:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):signal-map:(?<SignalMapId>[^/:]+)',
        captureGroups: ['AccountId', 'SignalMapId'],
    },
    'AWS::MediaPackage::Asset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackage-vod:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):assets/(?<AssetIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'AssetIdentifier'],
    },
    'AWS::MediaPackage::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackage:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channels/(?<ChannelIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelIdentifier'],
    },
    'AWS::MediaPackage::OriginEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackage:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):origin_endpoints/(?<OriginEndpointIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'OriginEndpointIdentifier'],
    },
    'AWS::MediaPackage::PackagingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackage-vod:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):packaging-configurations/(?<PackagingConfigurationIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'PackagingConfigurationIdentifier'],
    },
    'AWS::MediaPackage::PackagingGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackage-vod:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):packaging-groups/(?<PackagingGroupIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'PackagingGroupIdentifier'],
    },
    'AWS::MediaPackageV2::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackagev2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelGroup/(?<ChannelGroupName>[^/:]+)/channel/(?<ChannelName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelGroupName', 'ChannelName'],
    },
    'AWS::MediaPackageV2::ChannelGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackagev2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelGroup/(?<ChannelGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelGroupName'],
    },
    'AWS::MediaPackageV2::ChannelPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackagev2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelGroup/(?<ChannelGroupName>[^/:]+)/channel/(?<ChannelName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelGroupName', 'ChannelName'],
    },
    'AWS::MediaPackageV2::OriginEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackagev2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelGroup/(?<ChannelGroupName>[^/:]+)/channel/(?<ChannelName>[^/:]+)/originEndpoint/(?<OriginEndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelGroupName', 'ChannelName', 'OriginEndpointName'],
    },
    'AWS::MediaPackageV2::OriginEndpointPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediapackagev2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channelGroup/(?<ChannelGroupName>[^/:]+)/channel/(?<ChannelName>[^/:]+)/originEndpoint/(?<OriginEndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelGroupName', 'ChannelName', 'OriginEndpointName'],
    },
    'AWS::MediaStore::Container': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediastore:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):container/(?<ContainerName>[^/:]+)',
        captureGroups: ['AccountId', 'ContainerName'],
    },
    'AWS::MediaTailor::Channel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediatailor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):channel/(?<ChannelName>[^/:]+)',
        captureGroups: ['AccountId', 'ChannelName'],
    },
    'AWS::MediaTailor::LiveSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediatailor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):liveSource/(?<SourceLocationName>[^/:]+)/(?<LiveSourceName>[^/:]+)',
        captureGroups: ['AccountId', 'SourceLocationName', 'LiveSourceName'],
    },
    'AWS::MediaTailor::PlaybackConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediatailor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):playbackConfiguration/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::MediaTailor::SourceLocation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediatailor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sourceLocation/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::MediaTailor::VodSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mediatailor:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vodSource/(?<SourceLocationName>[^/:]+)/(?<VodSourceName>[^/:]+)',
        captureGroups: ['AccountId', 'SourceLocationName', 'VodSourceName'],
    },
    'AWS::MemoryDB::ACL': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):acl/(?<AclName>[^/:]+)',
        captureGroups: ['AccountId', 'AclName'],
    },
    'AWS::MemoryDB::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::MemoryDB::MultiRegionCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb::(?<AccountId>[0-9]{12}):multiregioncluster/(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::MemoryDB::ParameterGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):parametergroup/(?<ParameterGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ParameterGroupName'],
    },
    'AWS::MemoryDB::SubnetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):subnetgroup/(?<SubnetGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'SubnetGroupName'],
    },
    'AWS::MemoryDB::User': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):memorydb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):user/(?<UserName>[^/:]+)',
        captureGroups: ['AccountId', 'UserName'],
    },
    'AWS::Neptune::DBCluster': {
        arnRegex: 'arn:aws:rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<DBClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'DBClusterId'],
    },
    'AWS::Neptune::DBClusterParameterGroup': {
        arnRegex: 'arn:aws:rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster-pg:(?<ClusterPGName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterPGName'],
    },
    'AWS::Neptune::DBInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):db:(?<DbInstanceName>[^:/]+)',
        captureGroups: ['AccountId', 'DbInstanceName'],
    },
    'AWS::Neptune::DBParameterGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):pg:(?<ParameterGroupName>[^/:]+)',
        captureGroups: ['Account', 'ParameterGroupName'],
    },
    'AWS::Neptune::DBSubnetGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):subgrp:(?<SubnetGroupName>[^/:]+)',
        captureGroups: ['Account', 'SubnetGroupName'],
    },
    'AWS::NeptuneGraph::Graph': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):neptune-graph:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):graph/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::NetworkFirewall::Firewall': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):network-firewall:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):firewall/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::NetworkFirewall::FirewallPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):network-firewall:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):firewall-policy/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::NetworkFirewall::RuleGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):network-firewall:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stateful-rulegroup/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::NetworkFirewall::TLSInspectionConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):network-firewall:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):tls-configuration/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::NetworkFirewall::VpcEndpointAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):network-firewall:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpc-endpoint-association/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::NetworkManager::ConnectAttachment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):attachment/(?<AttachmentId>[^/:]+)',
        captureGroups: ['AccountId', 'AttachmentId'],
    },
    'AWS::NetworkManager::ConnectPeer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):connect-peer/(?<ConnectPeerId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectPeerId'],
    },
    'AWS::NetworkManager::CoreNetwork': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):core-network/(?<CoreNetworkId>[^/:]+)',
        captureGroups: ['AccountId', 'CoreNetworkId'],
    },
    'AWS::NetworkManager::Device': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):device/(?<GlobalNetworkId>[^/:]+)/(?<DeviceId>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalNetworkId', 'DeviceId'],
    },
    'AWS::NetworkManager::GlobalNetwork': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):global-network/(?<GlobalNetworkId>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalNetworkId'],
    },
    'AWS::NetworkManager::Link': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):link/(?<GlobalNetworkId>[^/:]+)/(?<LinkId>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalNetworkId', 'LinkId'],
    },
    'AWS::NetworkManager::Site': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):networkmanager::(?<AccountId>[0-9]{12}):site/(?<GlobalNetworkId>[^/:]+)/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'GlobalNetworkId', 'ResourceId'],
    },
    'AWS::NetworkManager::TransitGatewayPeering': {
        arnRegex: 'arn:(?<Partition>[^:/]+):networkmanager::(?<Account>[^:/]+):peering/(?<ResourceId>[^:/]+)',
        captureGroups: ['Account', 'ResourceId'],
    },
    'AWS::NimbleStudio::Studio': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):nimble:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):studio/(?<StudioId>[^/:]+)',
        captureGroups: ['AccountId', 'StudioId'],
    },
    'AWS::Notifications::EventRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):notifications::(?<AccountId>[0-9]{12}):configuration/(?<NotificationConfigurationId>[^:/]+)/rule/(?<EventRuleId>[^:/]+)',
        captureGroups: ['AccountId', 'NotificationConfigurationId', 'EventRuleId'],
    },
    'AWS::Notifications::NotificationConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):notifications::(?<AccountId>[0-9]{12}):configuration/(?<NotificationConfigurationId>[^:/]+)',
        captureGroups: ['AccountId', 'NotificationConfigurationId'],
    },
    'AWS::NotificationsContacts::EmailContact': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):notifications-contacts::(?<AccountId>[0-9]{12}):emailcontact/(?<EmailContactId>[^:/]+)',
        captureGroups: ['AccountId', 'EmailContactId'],
    },
    'AWS::ODB::CloudAutonomousVmCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):odb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cloud-autonomous-vm-cluster/(?<CloudAutonomousVmClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'CloudAutonomousVmClusterId'],
    },
    'AWS::ODB::CloudExadataInfrastructure': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):odb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cloud-exadata-infrastructure/(?<CloudExadataInfrastructureId>[^/:]+)',
        captureGroups: ['AccountId', 'CloudExadataInfrastructureId'],
    },
    'AWS::ODB::CloudVmCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):odb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cloud-vm-cluster/(?<CloudVmClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'CloudVmClusterId'],
    },
    'AWS::ODB::OdbNetwork': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):odb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):odb-network/(?<OdbNetworkId>[^/:]+)',
        captureGroups: ['AccountId', 'OdbNetworkId'],
    },
    'AWS::ODB::OdbPeeringConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):odb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):odb-peering-connection/(?<OdbPeeringConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'OdbPeeringConnectionId'],
    },
    'AWS::OSIS::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):osis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipeline/(?<PipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineName'],
    },
    'AWS::Oam::Link': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):oam:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):link/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Oam::Sink': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):oam:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sink/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::ObservabilityAdmin::OrganizationCentralizationRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):observabilityadmin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):organization-centralization-rule/(?<CentralizationRuleName>[^/:]+)',
        captureGroups: ['AccountId', 'CentralizationRuleName'],
    },
    'AWS::ObservabilityAdmin::OrganizationTelemetryRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):observabilityadmin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):organization-telemetry-rule/(?<TelemetryRuleName>[^/:]+)',
        captureGroups: ['AccountId', 'TelemetryRuleName'],
    },
    'AWS::ObservabilityAdmin::S3TableIntegration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):observabilityadmin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):s3tableintegration/(?<S3TableIntegrationIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'S3TableIntegrationIdentifier'],
    },
    'AWS::ObservabilityAdmin::TelemetryPipelines': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):observabilityadmin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):telemetry-pipeline/(?<TelemetryPipelineIdentifier>[^:/]+)',
        captureGroups: ['AccountId', 'TelemetryPipelineIdentifier'],
    },
    'AWS::ObservabilityAdmin::TelemetryRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):observabilityadmin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):telemetry-rule/(?<TelemetryRuleName>[^/:]+)',
        captureGroups: ['AccountId', 'TelemetryRuleName'],
    },
    'AWS::Omics::AnnotationStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):annotationStore/(?<AnnotationStoreName>[^/:]+)',
        captureGroups: ['AccountId', 'AnnotationStoreName'],
    },
    'AWS::Omics::ReferenceStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):referenceStore/(?<ReferenceStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'ReferenceStoreId'],
    },
    'AWS::Omics::RunGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):runGroup/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Omics::SequenceStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sequenceStore/(?<SequenceStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'SequenceStoreId'],
    },
    'AWS::Omics::VariantStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):variantStore/(?<VariantStoreName>[^/:]+)',
        captureGroups: ['AccountId', 'VariantStoreName'],
    },
    'AWS::Omics::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Omics::WorkflowVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<Id>[^/:]+)/version/(?<VersionName>[^/:]+)',
        captureGroups: ['AccountId', 'Id', 'VersionName'],
    },
    'AWS::OpenSearchServerless::Collection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aoss:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):collection/(?<CollectionId>[^:/]+)',
        captureGroups: ['AccountId', 'CollectionId'],
    },
    'AWS::OpenSearchServerless::CollectionGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aoss:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):collection-group/(?<CollectionGroupId>[^:/]+)',
        captureGroups: ['AccountId', 'CollectionGroupId'],
    },
    'AWS::OpenSearchService::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):es:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domain/(?<DomainName>[^/:]+)',
        captureGroups: ['Account', 'DomainName'],
    },
    'AWS::OpsWorks::Instance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):opsworks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'UUID'],
    },
    'AWS::OpsWorks::Layer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):opsworks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):layer/(?<UUID>[^/:]+)',
        captureGroups: ['AccountId', 'UUID'],
    },
    'AWS::OpsWorks::Stack': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):opsworks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stack/(?<StackId>[^:]+)',
        captureGroups: ['AccountId', 'StackId'],
    },
    'AWS::Organizations::Account': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):organizations::(?<AccountId>[0-9]{12}):account/(?<OrganizationId>o-[a-z0-9]+)/(?<MemberAccountId>[0-9]{12})',
        captureGroups: ['AccountId', 'OrganizationId', 'MemberAccountId'],
    },
    'AWS::Organizations::Organization': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):organizations::(?<AccountId>[0-9]{12}):organization/(?<OrganizationId>o-[a-z0-9]+)',
        captureGroups: ['AccountId', 'OrganizationId'],
    },
    'AWS::Organizations::OrganizationalUnit': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):organizations::(?<AccountId>[0-9]{12}):ou/(?<OrganizationId>o-[a-z0-9]+)/(?<OrganizationalUnitId>ou-[0-9a-z]{4,32}-[a-z0-9]{8,32})',
        captureGroups: ['AccountId', 'OrganizationId', 'OrganizationalUnitId'],
    },
    'AWS::Organizations::Policy': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):organizations::(?<Account>[0-9]{12}):policy/o-(?<OrganizationId>[a-z0-9]+)/(?<PolicyType>[0-9a-z_]+)/p-(?<PolicyId>[a-z0-9]+)',
        captureGroups: ['Account', 'OrganizationId', 'PolicyType', 'PolicyId'],
    },
    'AWS::Organizations::ResourcePolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):organizations::(?<AccountId>[0-9]{12}):resourcepolicy/o-(?<OrganizationId>[^/:]+)/rp-(?<ResourcePolicyId>[^/:]+)',
        captureGroups: ['AccountId', 'OrganizationId', 'ResourcePolicyId'],
    },
    'AWS::PCAConnectorAD::Connector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pca-connector-ad:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorId'],
    },
    'AWS::PCAConnectorAD::DirectoryRegistration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pca-connector-ad:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):directory-registration/(?<DirectoryId>[^/:]+)',
        captureGroups: ['AccountId', 'DirectoryId'],
    },
    'AWS::PCAConnectorAD::Template': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pca-connector-ad:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorId>[^/:]+)/template/(?<TemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorId', 'TemplateId'],
    },
    'AWS::PCAConnectorSCEP::Challenge': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pca-connector-scep:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorId>[^/:]+)/challenge/(?<ChallengeId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorId', 'ChallengeId'],
    },
    'AWS::PCAConnectorSCEP::Connector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pca-connector-scep:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorId'],
    },
    'AWS::PCS::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pcs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterIdentifier'],
    },
    'AWS::PCS::ComputeNodeGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pcs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterIdentifier>[^/:]+)/computenodegroup/(?<ComputeNodeGroupIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterIdentifier', 'ComputeNodeGroupIdentifier'],
    },
    'AWS::PCS::Queue': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):pcs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterIdentifier>[^/:]+)/queue/(?<QueueIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterIdentifier', 'QueueIdentifier'],
    },
    'AWS::Panorama::ApplicationInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):panorama:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):applicationInstance/(?<ApplicationInstanceId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationInstanceId'],
    },
    'AWS::Panorama::Package': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):panorama:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):package/(?<PackageId>[^/:]+)',
        captureGroups: ['AccountId', 'PackageId'],
    },
    'AWS::PaymentCryptography::Alias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):payment-cryptography:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):alias/(?<Alias>[^/:]+)',
        captureGroups: ['AccountId', 'Alias'],
    },
    'AWS::PaymentCryptography::Key': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):payment-cryptography:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):key/(?<KeyId>[^/:]+)',
        captureGroups: ['AccountId', 'KeyId'],
    },
    'AWS::Personalize::Dataset': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):personalize:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):dataset/(?<ResourceId>[^:]+)',
        captureGroups: ['Account', 'ResourceId'],
    },
    'AWS::Personalize::DatasetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):personalize:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset-group/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Personalize::Schema': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):personalize:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schema/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Personalize::Solution': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):personalize:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):solution/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Pinpoint::App': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^/:]+)',
        captureGroups: ['AccountId', 'AppId'],
    },
    'AWS::Pinpoint::Campaign': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^/:]+)/campaigns/(?<CampaignId>[^/:]+)',
        captureGroups: ['AccountId', 'AppId', 'CampaignId'],
    },
    'AWS::Pinpoint::EmailTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):templates/(?<TemplateName>[^/:]+)/EMAIL',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::Pinpoint::EventStream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^/:]+)/eventstream',
        captureGroups: ['AccountId', 'AppId'],
    },
    'AWS::Pinpoint::InAppTemplate': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):templates',
        captureGroups: ['AccountId'],
    },
    'AWS::Pinpoint::PushTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):templates/(?<TemplateName>[^/:]+)/PUSH',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::Pinpoint::Segment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):apps/(?<AppId>[^/:]+)/segments/(?<SegmentId>[^/:]+)',
        captureGroups: ['AccountId', 'AppId', 'SegmentId'],
    },
    'AWS::Pinpoint::SmsTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):mobiletargeting:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):templates/(?<TemplateName>[^/:]+)/SMS',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::PinpointEmail::ConfigurationSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration-set/(?<ConfigurationSetName>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigurationSetName'],
    },
    'AWS::PinpointEmail::DedicatedIpPool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dedicated-ip-pool/(?<DedicatedIPPool>[^/:]+)',
        captureGroups: ['AccountId', 'DedicatedIPPool'],
    },
    'AWS::Pipes::Pipe': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):pipes:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipe/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::Proton::EnvironmentAccountConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):proton:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment-account-connection/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Proton::EnvironmentTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):proton:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment-template/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::Proton::ServiceTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):proton:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service-template/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::QBusiness::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::QBusiness::DataAccessor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/data-accessor/(?<DataAccessorId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'DataAccessorId'],
    },
    'AWS::QBusiness::DataSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/index/(?<IndexId>[^/:]+)/data-source/(?<DataSourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'IndexId', 'DataSourceId'],
    },
    'AWS::QBusiness::Index': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/index/(?<IndexId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'IndexId'],
    },
    'AWS::QBusiness::Plugin': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/plugin/(?<PluginId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'PluginId'],
    },
    'AWS::QBusiness::Retriever': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/retriever/(?<RetrieverId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'RetrieverId'],
    },
    'AWS::QBusiness::WebExperience': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qbusiness:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)/web-experience/(?<WebExperienceId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId', 'WebExperienceId'],
    },
    'AWS::QLDB::Ledger': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qldb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ledger/(?<LedgerName>[A-Za-z0-9-]+)',
        captureGroups: ['AccountId', 'LedgerName'],
    },
    'AWS::QLDB::Stream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):qldb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stream/(?<LedgerName>[A-Za-z0-9-]+)/(?<StreamId>[A-Za-z0-9]+)',
        captureGroups: ['AccountId', 'LedgerName', 'StreamId'],
    },
    'AWS::QuickSight::ActionConnector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):action-connector/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::Analysis': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):analysis/(?<AnalysisId>[^/:]+)',
        captureGroups: ['AccountId', 'AnalysisId'],
    },
    'AWS::QuickSight::CustomPermissions': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):custompermissions/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::Dashboard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dashboard/(?<DashboardId>[^/:]+)',
        captureGroups: ['AccountId', 'DashboardId'],
    },
    'AWS::QuickSight::DataSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::DataSource': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):datasource/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::Folder': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):folder/(?<FolderId>[^/:]+)',
        captureGroups: ['AccountId', 'FolderId'],
    },
    'AWS::QuickSight::RefreshSchedule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataset/(?<DatasetId>[^/:]+)/refresh-schedule/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'DatasetId', 'ResourceId'],
    },
    'AWS::QuickSight::Template': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):template/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::Theme': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):theme/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::Topic': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):topic/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::QuickSight::VPCConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):quicksight:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vpcConnection/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::RAM::Permission': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ram:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):permission/(?<ResourcePath>[^:/]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::RAM::ResourceShare': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ram:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resource-share/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
    },
    'AWS::RDS::CustomDBEngineVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cev:(?<Engine>[^/:]+)/(?<EngineVersion>[^/:]+)/(?<CustomDbEngineVersionId>[^/:]+)',
        captureGroups: ['AccountId', 'Engine', 'EngineVersion', 'CustomDbEngineVersionId'],
    },
    'AWS::RDS::DBCluster': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):cluster:(?<DbClusterInstanceName>[^/:]+)',
        captureGroups: ['Account', 'DbClusterInstanceName'],
    },
    'AWS::RDS::DBClusterParameterGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster-pg:(?<ClusterParameterGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterParameterGroupName'],
    },
    'AWS::RDS::DBInstance': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):db:(?<DbInstanceName>[^/:]+)',
        captureGroups: ['Account', 'DbInstanceName'],
    },
    'AWS::RDS::DBParameterGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):pg:(?<ParameterGroupName>[^/:]+)',
        captureGroups: ['Account', 'ParameterGroupName'],
    },
    'AWS::RDS::DBProxy': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):db-proxy:(?<DbProxyId>[^/:]+)',
        captureGroups: ['Account', 'DbProxyId'],
    },
    'AWS::RDS::DBProxyEndpoint': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):db-proxy-endpoint:(?<DbProxyEndpointId>[^/:]+)',
        captureGroups: ['Account', 'DbProxyEndpointId'],
    },
    'AWS::RDS::DBProxyTargetGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):target-group:(?<TargetGroupId>[^/:]+)',
        captureGroups: ['Account', 'TargetGroupId'],
    },
    'AWS::RDS::DBSecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):secgrp:(?<SecurityGroupName>(?:default:)?[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupName'],
    },
    'AWS::RDS::DBSubnetGroup': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):subgrp:(?<SubnetGroupName>[^/:]+)',
        captureGroups: ['Account', 'SubnetGroupName'],
    },
    'AWS::RDS::EventSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):es:(?<SubscriptionName>[^/:]+)',
        captureGroups: ['AccountId', 'SubscriptionName'],
    },
    'AWS::RDS::GlobalCluster': {
        arnRegex: '^arn:(?<Partition>[a-z-]+):rds::(?<Account>[0-9]{12}):global-cluster:(?<GlobalCluster>[^/:]+)',
        captureGroups: ['Account', 'GlobalCluster'],
    },
    'AWS::RDS::Integration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):integration:(?<IntegrationIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'IntegrationIdentifier'],
    },
    'AWS::RDS::OptionGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):og:(?<OptionGroupName>[^/]+)',
        captureGroups: ['AccountId', 'OptionGroupName'],
    },
    'AWS::RTBFabric::InboundExternalLink': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rtbfabric:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)/link/(?<LinkId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId', 'LinkId'],
    },
    'AWS::RTBFabric::Link': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rtbfabric:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)/link/(?<LinkId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId', 'LinkId'],
    },
    'AWS::RTBFabric::OutboundExternalLink': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rtbfabric:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)/link/(?<LinkId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId', 'LinkId'],
    },
    'AWS::RTBFabric::RequesterGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rtbfabric:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId'],
    },
    'AWS::RTBFabric::ResponderGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rtbfabric:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):gateway/(?<GatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'GatewayId'],
    },
    'AWS::RUM::AppMonitor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rum:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):appmonitor/(?<Name>[^:/]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::Rbin::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rbin:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rule/(?<ResourceName>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceName'],
    },
    'AWS::Redshift::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
    },
    'AWS::Redshift::ClusterParameterGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):parametergroup:(?<ParameterGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ParameterGroupName'],
    },
    'AWS::Redshift::ClusterSecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):securitygroup:(?<SecurityGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupName'],
    },
    'AWS::Redshift::ClusterSecurityGroupIngress': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):securitygroup:(?<SecurityGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupName'],
    },
    'AWS::Redshift::ClusterSubnetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):subnetgroup:(?<SubnetGroupName>[^/:]+)',
        captureGroups: ['Account', 'SubnetGroupName'],
    },
    'AWS::Redshift::EventSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):eventsubscription:(?<EventSubscriptionName>[^/:]+)',
        captureGroups: ['AccountId', 'EventSubscriptionName'],
    },
    'AWS::Redshift::Integration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):integration:(?<IntegrationIdentifier>[^/:]+)',
        captureGroups: ['AccountId', 'IntegrationIdentifier'],
    },
    'AWS::RedshiftServerless::Namespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift-serverless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):namespace/(?<NamespaceId>[^/:]+)',
        captureGroups: ['AccountId', 'NamespaceId'],
    },
    'AWS::RedshiftServerless::Snapshot': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift-serverless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):snapshot/(?<SnapshotId>[^/:]+)',
        captureGroups: ['AccountId', 'SnapshotId'],
    },
    'AWS::RedshiftServerless::Workgroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):redshift-serverless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workgroup/(?<WorkgroupId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkgroupId'],
    },
    'AWS::RefactorSpaces::Application': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):refactor-spaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^/:]+)/application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentId', 'ApplicationId'],
    },
    'AWS::RefactorSpaces::Environment': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):refactor-spaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentId'],
    },
    'AWS::RefactorSpaces::Route': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):refactor-spaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^/:]+)/application/(?<ApplicationId>[^/:]+)/route/(?<RouteId>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentId', 'ApplicationId', 'RouteId'],
    },
    'AWS::RefactorSpaces::Service': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):refactor-spaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^/:]+)/application/(?<ApplicationId>[^/:]+)/service/(?<ServiceId>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentId', 'ApplicationId', 'ServiceId'],
    },
    'AWS::Rekognition::Collection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rekognition:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):collection/(?<CollectionId>[^/:]+)',
        captureGroups: ['AccountId', 'CollectionId'],
    },
    'AWS::Rekognition::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rekognition:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)/(?<CreationTimestamp>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName', 'CreationTimestamp'],
    },
    'AWS::Rekognition::StreamProcessor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rekognition:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):streamprocessor/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::ResilienceHub::App': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resiliencehub:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):app/(?<AppId>[^/:]+)',
        captureGroups: ['Account', 'AppId'],
    },
    'AWS::ResilienceHub::ResiliencyPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resiliencehub:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):resiliency-policy/(?<PolicyId>[^/:]+)',
        captureGroups: ['Account', 'PolicyId'],
    },
    'AWS::ResourceExplorer2::Index': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resource-explorer-2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):index/(?<IndexUuid>[^/:]+)',
        captureGroups: ['Account', 'IndexUuid'],
    },
    'AWS::ResourceExplorer2::View': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resource-explorer-2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):view/(?<ViewName>[^/:]+)/(?<ViewUuid>[^/:]+)',
        captureGroups: ['Account', 'ViewName', 'ViewUuid'],
    },
    'AWS::ResourceGroups::Group': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resource-groups:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):group/(?<GroupName>[^/:]+(/[^/:]+)?)',
        captureGroups: ['AccountId', 'GroupName'],
    },
    'AWS::ResourceGroups::TagSyncTask': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):resource-groups:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):group/(?<GroupName>[^/:]+)/tag-sync-task/(?<TaskId>[^/:]+)',
        captureGroups: ['AccountId', 'GroupName', 'TaskId'],
    },
    'AWS::RoboMaker::Fleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):robomaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):deployment-fleet/(?<FleetName>[^/:]+)/(?<CreatedOnEpoch>[^/:]+)',
        captureGroups: ['AccountId', 'FleetName', 'CreatedOnEpoch'],
    },
    'AWS::RoboMaker::Robot': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):robomaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):robot/(?<RobotName>[^/:]+)/(?<CreatedOnEpoch>[^/:]+)',
        captureGroups: ['AccountId', 'RobotName', 'CreatedOnEpoch'],
    },
    'AWS::RoboMaker::RobotApplication': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):robomaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):robot-application/(?<ApplicationName>[^/:]+)/(?<CreatedOnEpoch>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'CreatedOnEpoch'],
    },
    'AWS::RoboMaker::SimulationApplication': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):robomaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):simulation-application/(?<ApplicationName>[^/:]+)/(?<CreatedOnEpoch>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationName', 'CreatedOnEpoch'],
    },
    'AWS::RolesAnywhere::CRL': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rolesanywhere:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):crl/(?<CrlId>[^:/]+)',
        captureGroups: ['AccountId', 'CrlId'],
    },
    'AWS::RolesAnywhere::Profile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rolesanywhere:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profile/(?<ProfileId>[^:/]+)',
        captureGroups: ['AccountId', 'ProfileId'],
    },
    'AWS::RolesAnywhere::TrustAnchor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rolesanywhere:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):trust-anchor/(?<TrustAnchorId>[^:/]+)',
        captureGroups: ['AccountId', 'TrustAnchorId'],
    },
    'AWS::Route53::CidrCollection': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):route53:::cidrcollection/(?<Id>[^/:]+)',
        captureGroups: ['Id'],
    },
    'AWS::Route53::HealthCheck': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):route53:::healthcheck/(?<Id>[^/:]+)',
        captureGroups: ['Id'],
    },
    'AWS::Route53::HostedZone': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):route53:::hostedzone/(?<Id>[^/:]+)',
        captureGroups: ['Id'],
    },
    'AWS::Route53Profiles::Profile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53profiles:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profile/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Profiles::ProfileAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53profiles:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profile-association/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53RecoveryControl::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-control::(?<AccountId>[0-9]{12}):cluster/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53RecoveryControl::ControlPanel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-control::(?<AccountId>[0-9]{12}):controlpanel/(?<ControlPanelId>[^:/]+)',
        captureGroups: ['AccountId', 'ControlPanelId'],
    },
    'AWS::Route53RecoveryControl::RoutingControl': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-control::(?<AccountId>[0-9]{12}):controlpanel/(?<ControlPanelId>[^:/]+)/routingcontrol/(?<RoutingControlId>[^:/]+)',
        captureGroups: ['AccountId', 'ControlPanelId', 'RoutingControlId'],
    },
    'AWS::Route53RecoveryControl::SafetyRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-control::(?<AccountId>[0-9]{12}):controlpanel/(?<ControlPanelId>[^:/]+)/safetyrule/(?<SafetyRuleId>[^:/]+)',
        captureGroups: ['AccountId', 'ControlPanelId', 'SafetyRuleId'],
    },
    'AWS::Route53RecoveryReadiness::Cell': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-readiness::(?<AccountId>[0-9]{12}):cell/(?<CellName>[a-zA-Z0-9_-]+)',
        captureGroups: ['AccountId', 'CellName'],
    },
    'AWS::Route53RecoveryReadiness::ReadinessCheck': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-readiness::(?<AccountId>[0-9]{12}):readiness-check/(?<ResourceId>[a-zA-Z0-9_-]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53RecoveryReadiness::RecoveryGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-readiness::(?<AccountId>[0-9]{12}):recovery-group/(?<ResourceId>[a-zA-Z0-9_-]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53RecoveryReadiness::ResourceSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-readiness::(?<AccountId>[0-9]{12}):resource-set/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::FirewallDomainList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):firewall-domain-list/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::FirewallRuleGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):firewall-rule-group/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::FirewallRuleGroupAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):firewall-rule-group-association/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::OutpostResolver': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):outpost-resolver/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::ResolverConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resolver-config/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::ResolverDNSSECConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resolver-dnssec-config/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::ResolverEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resolver-endpoint/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::ResolverQueryLoggingConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resolver-query-log-config/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::Route53Resolver::ResolverRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53resolver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resolver-rule/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::S3::AccessGrant': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-grants/default/grant/(?<Token>[^/:]+)',
        captureGroups: ['AccountId', 'Token'],
    },
    'AWS::S3::AccessGrantsInstance': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-grants/default',
        captureGroups: ['AccountId'],
    },
    'AWS::S3::AccessGrantsLocation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):access-grants/default/location/(?<Token>[^/:]+)',
        captureGroups: ['AccountId', 'Token'],
    },
    'AWS::S3::AccessPoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):accesspoint/(?<AccessPointName>[^/:]+)',
        captureGroups: ['Account', 'AccessPointName'],
    },
    'AWS::S3::Bucket': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):s3:::(?<BucketName>[^/:]+)',
        captureGroups: ['BucketName'],
    },
    'AWS::S3::MultiRegionAccessPoint': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):s3::(?<AccountId>[0-9]{12}):accesspoint/(?<AccessPointAlias>[^/:]+)',
        captureGroups: ['AccountId', 'AccessPointAlias'],
    },
    'AWS::S3::StorageLens': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):storage-lens/(?<ConfigId>[^:/]+)',
        captureGroups: ['AccountId', 'ConfigId'],
    },
    'AWS::S3::StorageLensGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):storage-lens-group/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
    },
    'AWS::S3Express::AccessPoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3express:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):accesspoint/(?<AccessPointName>[^/:]+)',
        captureGroups: ['AccountId', 'AccessPointName'],
    },
    'AWS::S3Express::DirectoryBucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3express:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<BucketName>[^:/]+)',
        captureGroups: ['AccountId', 'BucketName'],
    },
    'AWS::S3ObjectLambda::AccessPoint': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):s3-object-lambda:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):accesspoint/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::S3Outposts::AccessPoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3-outposts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):outpost/(?<OutpostId>[^/:]+)/accesspoint/(?<AccessPointName>[^/:]+)',
        captureGroups: ['AccountId', 'OutpostId', 'AccessPointName'],
    },
    'AWS::S3Outposts::Bucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3-outposts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):outpost/(?<OutpostId>[^/:]+)/bucket/(?<BucketName>[^/:]+)',
        captureGroups: ['AccountId', 'OutpostId', 'BucketName'],
    },
    'AWS::S3Outposts::Endpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3-outposts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):outpost/(?<OutpostId>[^/:]+)/endpoint/(?<EndpointId>[^/:]+)',
        captureGroups: ['AccountId', 'OutpostId', 'EndpointId'],
    },
    'AWS::S3Tables::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3tables:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<TableBucketName>[^/:]+)/table/(?<TableID>[^/:]+)',
        captureGroups: ['AccountId', 'TableBucketName', 'TableID'],
    },
    'AWS::S3Tables::TableBucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3tables:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<TableBucketName>[^/:]+)',
        captureGroups: ['AccountId', 'TableBucketName'],
    },
    'AWS::S3Vectors::Index': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3vectors:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<BucketName>[^/:]+)/index/(?<IndexName>[^/:]+)',
        captureGroups: ['AccountId', 'BucketName', 'IndexName'],
    },
    'AWS::S3Vectors::VectorBucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3vectors:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<BucketName>[^/:]+)',
        captureGroups: ['AccountId', 'BucketName'],
    },
    'AWS::SDB::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sdb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainName'],
    },
    'AWS::SES::ContactList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):contact-list/(?<ContactListName>[^/:]+)',
        captureGroups: ['AccountId', 'ContactListName'],
    },
    'AWS::SES::CustomVerificationEmailTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):custom-verification-email-template/(?<TemplateName>[^:/]+)',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::SES::EmailIdentity': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):identity/(?<IdentityName>[^/:]+)',
        captureGroups: ['AccountId', 'IdentityName'],
    },
    'AWS::SES::MailManagerAddonInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):addon-instance/(?<AddonInstanceId>[^:/]+)',
        captureGroups: ['AccountId', 'AddonInstanceId'],
    },
    'AWS::SES::MailManagerAddonSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):addon-subscription/(?<AddonSubscriptionId>[^:/]+)',
        captureGroups: ['AccountId', 'AddonSubscriptionId'],
    },
    'AWS::SES::MailManagerAddressList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-address-list/(?<AddressListId>[^:/]+)',
        captureGroups: ['AccountId', 'AddressListId'],
    },
    'AWS::SES::MailManagerArchive': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-archive/(?<ArchiveId>[^/:]+)',
        captureGroups: ['AccountId', 'ArchiveId'],
    },
    'AWS::SES::MailManagerIngressPoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-ingress-point/(?<IngressPointId>[^:/]+)',
        captureGroups: ['AccountId', 'IngressPointId'],
    },
    'AWS::SES::MailManagerRelay': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-smtp-relay/(?<RelayId>[^:/]+)',
        captureGroups: ['AccountId', 'RelayId'],
    },
    'AWS::SES::MailManagerRuleSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-rule-set/(?<RuleSetId>[^:/]+)',
        captureGroups: ['AccountId', 'RuleSetId'],
    },
    'AWS::SES::MailManagerTrafficPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mailmanager-traffic-policy/(?<TrafficPolicyId>[^:/]+)',
        captureGroups: ['AccountId', 'TrafficPolicyId'],
    },
    'AWS::SES::MultiRegionEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):multi-region-endpoint/(?<EndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'EndpointName'],
    },
    'AWS::SES::ReceiptFilter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):receipt-filter/(?<ReceiptFilterName>[^/:]+)',
        captureGroups: ['AccountId', 'ReceiptFilterName'],
    },
    'AWS::SES::ReceiptRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):receipt-rule-set/(?<ReceiptRuleSetName>[^/:]+):receipt-rule/(?<ReceiptRuleName>[^/:]+)',
        captureGroups: ['AccountId', 'ReceiptRuleSetName', 'ReceiptRuleName'],
    },
    'AWS::SES::ReceiptRuleSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):receipt-rule-set/(?<ReceiptRuleSetName>[^/:]+)',
        captureGroups: ['AccountId', 'ReceiptRuleSetName'],
    },
    'AWS::SES::Template': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):template/(?<TemplateName>[^/:]+)',
        captureGroups: ['AccountId', 'TemplateName'],
    },
    'AWS::SES::Tenant': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):tenant/(?<TenantName>[^/:]+)/(?<TenantId>[^/:]+)',
        captureGroups: ['AccountId', 'TenantName', 'TenantId'],
    },
    'AWS::SMSVOICE::ConfigurationSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration-set/(?<ConfigurationSetName>[^:/]+)',
        captureGroups: ['AccountId', 'ConfigurationSetName'],
    },
    'AWS::SMSVOICE::OptOutList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):opt-out-list/(?<OptOutListName>[^:/]+)',
        captureGroups: ['AccountId', 'OptOutListName'],
    },
    'AWS::SMSVOICE::PhoneNumber': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):phone-number/(?<PhoneNumberId>[^:/]+)',
        captureGroups: ['AccountId', 'PhoneNumberId'],
    },
    'AWS::SMSVOICE::Pool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pool/(?<PoolId>[^/:]+)',
        captureGroups: ['AccountId', 'PoolId'],
    },
    'AWS::SMSVOICE::ProtectConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):protect-configuration/(?<ProtectConfigurationId>[^:/]+)',
        captureGroups: ['AccountId', 'ProtectConfigurationId'],
    },
    'AWS::SMSVOICE::SenderId': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sms-voice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sender-id/(?<SenderId>[^:/]+)/(?<IsoCountryCode>[^:/]+)',
        captureGroups: ['AccountId', 'SenderId', 'IsoCountryCode'],
    },
    'AWS::SNS::Topic': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):sns:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<TopicName>[^/:]+)',
        captureGroups: ['AccountId', 'TopicName'],
    },
    'AWS::SQS::Queue': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):sqs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<QueueName>[^/:]+)',
        captureGroups: ['AccountId', 'QueueName'],
    },
    'AWS::SSM::Association': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):association/(?<AssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'AssociationId'],
    },
    'AWS::SSM::Document': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}|):document/(?<DocumentName>[^/:]+)',
        captureGroups: ['AccountId', 'DocumentName'],
    },
    'AWS::SSM::MaintenanceWindow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):maintenancewindow/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::SSM::MaintenanceWindowTarget': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):windowtarget/(?<WindowTargetId>[^/:]+)',
        captureGroups: ['AccountId', 'WindowTargetId'],
    },
    'AWS::SSM::MaintenanceWindowTask': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):windowtask/(?<WindowTaskId>[^/:]+)',
        captureGroups: ['AccountId', 'WindowTaskId'],
    },
    'AWS::SSM::Parameter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):parameter/(?<ParameterNameWithoutLeadingSlash>[a-zA-Z0-9_.\\-/]+)',
        captureGroups: ['AccountId', 'ParameterNameWithoutLeadingSlash'],
    },
    'AWS::SSM::PatchBaseline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):patchbaseline/(?<PatchBaselineIdResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'PatchBaselineIdResourceId'],
    },
    'AWS::SSM::ResourceDataSync': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resource-data-sync/(?<SyncName>[^/:]+)',
        captureGroups: ['AccountId', 'SyncName'],
    },
    'AWS::SSMContacts::Contact': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-contacts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):contact/(?<ContactAlias>[^/:]+)',
        captureGroups: ['AccountId', 'ContactAlias'],
    },
    'AWS::SSMContacts::ContactChannel': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-contacts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):contactchannel/(?<ContactAlias>[^/:]+)/(?<ContactChannelId>[^/:]+)',
        captureGroups: ['AccountId', 'ContactAlias', 'ContactChannelId'],
    },
    'AWS::SSMContacts::Rotation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-contacts:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rotation/(?<RotationId>[^/:]+)',
        captureGroups: ['AccountId', 'RotationId'],
    },
    'AWS::SSMIncidents::ReplicationSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-incidents::(?<AccountId>[0-9]{12}):replication-set/(?<ReplicationSet>[^/:]+)',
        captureGroups: ['AccountId', 'ReplicationSet'],
    },
    'AWS::SSMIncidents::ResponsePlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-incidents::(?<AccountId>[0-9]{12}):response-plan/(?<ResponsePlan>[^/:]+)',
        captureGroups: ['AccountId', 'ResponsePlan'],
    },
    'AWS::SSMQuickSetup::ConfigurationManager': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-quicksetup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration-manager/(?<ConfigurationManagerId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigurationManagerId'],
    },
    'AWS::SSO::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sso::(?<AccountId>[0-9]{12}):application/(?<InstanceId>[^:/]+)/(?<ApplicationId>[^:/]+)',
        captureGroups: ['AccountId', 'InstanceId', 'ApplicationId'],
    },
    'AWS::SSO::Instance': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):sso:::instance/(?<InstanceId>[^/:]+)',
        captureGroups: ['InstanceId'],
    },
    'AWS::SSO::PermissionSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sso:::permissionSet/(?<InstanceId>(sso)?ins-[a-zA-Z0-9-.]{16})/(?<PermissionSetId>ps-[a-zA-Z0-9-./]{16})',
        captureGroups: ['InstanceId', 'PermissionSetId'],
    },
    'AWS::SageMaker::App': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app/(?<DomainId>[^/:]+)/(?<UserProfileName>[^/:]+)/(?<AppType>[^/:]+)/(?<AppName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'UserProfileName', 'AppType', 'AppName'],
    },
    'AWS::SageMaker::AppImageConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app-image-config/(?<AppImageConfigName>[^/:]+)',
        captureGroups: ['AccountId', 'AppImageConfigName'],
    },
    'AWS::SageMaker::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterId>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterId'],
    },
    'AWS::SageMaker::CodeRepository': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):code-repository/(?<CodeRepositoryName>[^/:]+)',
        captureGroups: ['Account', 'CodeRepositoryName'],
    },
    'AWS::SageMaker::DataQualityJobDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-quality-job-definition/(?<DataQualityJobDefinitionName>[^/:]+)',
        captureGroups: ['AccountId', 'DataQualityJobDefinitionName'],
    },
    'AWS::SageMaker::Device': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):device-fleet/(?<DeviceFleetName>[^/:]+)/device/(?<DeviceName>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceFleetName', 'DeviceName'],
    },
    'AWS::SageMaker::DeviceFleet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):device-fleet/(?<DeviceFleetName>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceFleetName'],
    },
    'AWS::SageMaker::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::SageMaker::Endpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):endpoint/(?<EndpointName>[^/:]+)',
        captureGroups: ['AccountId', 'EndpointName'],
    },
    'AWS::SageMaker::EndpointConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):endpoint-config/(?<EndpointConfigName>[^/:]+)',
        captureGroups: ['AccountId', 'EndpointConfigName'],
    },
    'AWS::SageMaker::FeatureGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):feature-group/(?<FeatureGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'FeatureGroupName'],
    },
    'AWS::SageMaker::Image': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image/(?<ImageName>[^/:]+)',
        captureGroups: ['AccountId', 'ImageName'],
    },
    'AWS::SageMaker::ImageVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):image-version/(?<ImageName>[^/:]+)/(?<Version>[^/:]+)',
        captureGroups: ['AccountId', 'ImageName', 'Version'],
    },
    'AWS::SageMaker::InferenceComponent': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):inference-component/(?<InferenceComponentName>[^/:]+)',
        captureGroups: ['AccountId', 'InferenceComponentName'],
    },
    'AWS::SageMaker::InferenceExperiment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):inference-experiment/(?<InferenceExperimentName>[^/:]+)',
        captureGroups: ['AccountId', 'InferenceExperimentName'],
    },
    'AWS::SageMaker::MlflowTrackingServer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mlflow-tracking-server/(?<MlflowTrackingServerName>[^/:]+)',
        captureGroups: ['AccountId', 'MlflowTrackingServerName'],
    },
    'AWS::SageMaker::Model': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model/(?<ModelName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelName'],
    },
    'AWS::SageMaker::ModelBiasJobDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-bias-job-definition/(?<ModelBiasJobDefinitionName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelBiasJobDefinitionName'],
    },
    'AWS::SageMaker::ModelCard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-card/(?<ModelCardName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelCardName'],
    },
    'AWS::SageMaker::ModelExplainabilityJobDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-explainability-job-definition/(?<ModelExplainabilityJobDefinitionName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelExplainabilityJobDefinitionName'],
    },
    'AWS::SageMaker::ModelPackage': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-package/(?<ModelPackageName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelPackageName'],
    },
    'AWS::SageMaker::ModelPackageGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-package-group/(?<ModelPackageGroupName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelPackageGroupName'],
    },
    'AWS::SageMaker::ModelQualityJobDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-quality-job-definition/(?<ModelQualityJobDefinitionName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelQualityJobDefinitionName'],
    },
    'AWS::SageMaker::MonitoringSchedule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):monitoring-schedule/(?<MonitoringScheduleName>[^/:]+)',
        captureGroups: ['AccountId', 'MonitoringScheduleName'],
    },
    'AWS::SageMaker::NotebookInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):notebook-instance/(?<NotebookInstanceName>[^/:]+)',
        captureGroups: ['AccountId', 'NotebookInstanceName'],
    },
    'AWS::SageMaker::NotebookInstanceLifecycleConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):notebook-instance-lifecycle-config/(?<NotebookInstanceLifecycleConfigName>[^/:]+)',
        captureGroups: ['AccountId', 'NotebookInstanceLifecycleConfigName'],
    },
    'AWS::SageMaker::PartnerApp': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):partner-app/(?<AppId>[^/:]+)',
        captureGroups: ['AccountId', 'AppId'],
    },
    'AWS::SageMaker::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipeline/(?<PipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineName'],
    },
    'AWS::SageMaker::ProcessingJob': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):processing-job/(?<ProcessingJobName>[^/:]+)',
        captureGroups: ['AccountId', 'ProcessingJobName'],
    },
    'AWS::SageMaker::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName'],
    },
    'AWS::SageMaker::Space': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):space/(?<DomainId>[^/:]+)/(?<SpaceName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'SpaceName'],
    },
    'AWS::SageMaker::StudioLifecycleConfig': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):studio-lifecycle-config/(?<StudioLifecycleConfigName>[^/:]+)',
        captureGroups: ['AccountId', 'StudioLifecycleConfigName'],
    },
    'AWS::SageMaker::UserProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):user-profile/(?<DomainId>[^/:]+)/(?<UserProfileName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId', 'UserProfileName'],
    },
    'AWS::SageMaker::Workteam': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workteam/(?<WorkteamName>[^:]+)',
        captureGroups: ['AccountId', 'WorkteamName'],
    },
    'AWS::Scheduler::Schedule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):scheduler:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schedule/(?<GroupName>[^/:]+)/(?<ScheduleName>[^/:]+)',
        captureGroups: ['AccountId', 'GroupName', 'ScheduleName'],
    },
    'AWS::Scheduler::ScheduleGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):scheduler:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):schedule-group/(?<GroupName>[^/:]+)',
        captureGroups: ['AccountId', 'GroupName'],
    },
    'AWS::SecretsManager::Secret': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):secretsmanager:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):secret:(?<SecretId>[^:]+)',
        captureGroups: ['AccountId', 'SecretId'],
    },
    'AWS::SecurityHub::AggregatorV2': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):aggregatorv2/(?<AggregatorV2Id>[^/:]+)',
        captureGroups: ['AccountId', 'AggregatorV2Id'],
    },
    'AWS::SecurityHub::AutomationRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):automation-rule/(?<AutomationRuleId>[^/:]+)',
        captureGroups: ['AccountId', 'AutomationRuleId'],
    },
    'AWS::SecurityHub::AutomationRuleV2': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):automation-rulev2/(?<AutomationRuleV2Id>[^/:]+)',
        captureGroups: ['AccountId', 'AutomationRuleV2Id'],
    },
    'AWS::SecurityHub::ConfigurationPolicy': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):configuration-policy/(?<ConfigurationPolicyId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigurationPolicyId'],
    },
    'AWS::SecurityHub::ConnectorV2': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connectorv2/(?<ConnectorV2Id>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorV2Id'],
    },
    'AWS::SecurityHub::FindingAggregator': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):finding-aggregator/(?<FindingAggregatorId>[^/:]+)',
        captureGroups: ['AccountId', 'FindingAggregatorId'],
    },
    'AWS::SecurityHub::Hub': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):hub/default',
        captureGroups: ['AccountId'],
    },
    'AWS::SecurityHub::HubV2': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):hubv2/(?<HubV2Id>[^/:]+)',
        captureGroups: ['AccountId', 'HubV2Id'],
    },
    'AWS::SecurityHub::Insight': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):insight/(?<CompanyId>[^/:]+)/(?<ProductId>[^/:]+)/(?<UniqueId>[^/:]+)',
        captureGroups: ['AccountId', 'CompanyId', 'ProductId', 'UniqueId'],
    },
    'AWS::SecurityHub::ProductSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):product-subscription/(?<Company>[^/:]+)/(?<ProductId>[^/:]+)',
        captureGroups: ['AccountId', 'Company', 'ProductId'],
    },
    'AWS::SecurityHub::Standard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securityhub:::ruleset/(?<StandardsName>[^/:]+)/v/(?<StandardsVersion>[^/:]+)',
        captureGroups: ['StandardsName', 'StandardsVersion'],
    },
    'AWS::SecurityLake::DataLake': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securitylake:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):data-lake/default',
        captureGroups: ['AccountId'],
    },
    'AWS::SecurityLake::Subscriber': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):securitylake:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):subscriber/(?<SubscriberId>[^:/]+)',
        captureGroups: ['AccountId', 'SubscriberId'],
    },
    'AWS::ServiceCatalog::CloudFormationProduct': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):catalog:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):product/(?<PortfolioId>[^/:]+)',
        captureGroups: ['AccountId', 'PortfolioId'],
    },
    'AWS::ServiceCatalog::CloudFormationProvisionedProduct': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):catalog:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):product/(?<PortfolioId>[^/:]+)',
        captureGroups: ['AccountId', 'PortfolioId'],
    },
    'AWS::ServiceCatalog::Portfolio': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):catalog:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):portfolio/(?<PortfolioId>[^/:]+)',
        captureGroups: ['AccountId', 'PortfolioId'],
    },
    'AWS::ServiceCatalogAppRegistry::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicecatalog:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/applications/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
    },
    'AWS::ServiceCatalogAppRegistry::AttributeGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicecatalog:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/attribute-groups/(?<AttributeGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'AttributeGroupId'],
    },
    'AWS::ServiceDiscovery::HttpNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicediscovery:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):namespace/(?<NamespaceId>[^/:]+)',
        captureGroups: ['AccountId', 'NamespaceId'],
    },
    'AWS::ServiceDiscovery::PrivateDnsNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicediscovery:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):namespace/(?<NamespaceId>[^/:]+)',
        captureGroups: ['AccountId', 'NamespaceId'],
    },
    'AWS::ServiceDiscovery::PublicDnsNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicediscovery:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):namespace/(?<NamespaceId>[^/:]+)',
        captureGroups: ['AccountId', 'NamespaceId'],
    },
    'AWS::ServiceDiscovery::Service': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):servicediscovery:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceId'],
    },
    'AWS::Shield::Protection': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):shield::(?<AccountId>[0-9]{12}):protection/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::Shield::ProtectionGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):shield::(?<AccountId>[0-9]{12}):protection-group/(?<ProtectionGroupId>[a-zA-Z0-9\\-]*)',
        captureGroups: ['AccountId', 'ProtectionGroupId'],
    },
    'AWS::Signer::SigningProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):signer:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):/signing-profiles/(?<ProfileName>[^/:]+)',
        captureGroups: ['Account', 'ProfileName'],
    },
    'AWS::SimSpaceWeaver::Simulation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):simspaceweaver:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):simulation/(?<SimulationName>[^/:]+)',
        captureGroups: ['AccountId', 'SimulationName'],
    },
    'AWS::StepFunctions::Activity': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):states:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):activity:(?<ActivityName>[^/:]+)',
        captureGroups: ['AccountId', 'ActivityName'],
    },
    'AWS::StepFunctions::StateMachine': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):states:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stateMachine:(?<StateMachineName>[^/:]+):(?<StateMachineAliasName>[^/:]+)',
        captureGroups: ['AccountId', 'StateMachineName', 'StateMachineAliasName'],
    },
    'AWS::StepFunctions::StateMachineAlias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):states:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stateMachine:(?<StateMachineName>[^/:]+):(?<StateMachineAliasName>[^/:]+)',
        captureGroups: ['AccountId', 'StateMachineName', 'StateMachineAliasName'],
    },
    'AWS::StepFunctions::StateMachineVersion': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):states:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stateMachine:(?<StateMachineName>[^/:]+):(?<StateMachineVersionId>[^/:]+)',
        captureGroups: ['AccountId', 'StateMachineName', 'StateMachineVersionId'],
    },
    'AWS::Synthetics::Canary': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):synthetics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):canary:(?<CanaryName>[^/:]+)',
        captureGroups: ['AccountId', 'CanaryName'],
    },
    'AWS::Synthetics::Group': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):synthetics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):group:(?<GroupId>[^/:]+)',
        captureGroups: ['AccountId', 'GroupId'],
    },
    'AWS::SystemsManagerSAP::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-sap:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<ApplicationType>[^/:]+)/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationType', 'ApplicationId'],
    },
    'AWS::Timestream::Database': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):timestream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):database/(?<DatabaseName>[^/:]+)',
        captureGroups: ['AccountId', 'DatabaseName'],
    },
    'AWS::Timestream::ScheduledQuery': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):timestream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):scheduled-query/(?<scheduledQueryName>[a-zA-Z0-9_.-]+)',
        captureGroups: ['AccountId', 'scheduledQueryName'],
    },
    'AWS::Timestream::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):timestream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):database/(?<databaseName>[a-zA-Z0-9_.-]+)/table/(?<tableName>[a-zA-Z0-9_.-]+)',
        captureGroups: ['AccountId', 'databaseName', 'tableName'],
    },
    'AWS::Transfer::Agreement': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):agreement/(?<ServerId>[^/:]+)/(?<AgreementId>[^:/]+)',
        captureGroups: ['AccountId', 'ServerId', 'AgreementId'],
    },
    'AWS::Transfer::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificate/(?<CertificateId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateId'],
    },
    'AWS::Transfer::Connector': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connector/(?<ConnectorId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectorId'],
    },
    'AWS::Transfer::Profile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):profile/(?<ProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'ProfileId'],
    },
    'AWS::Transfer::Server': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):server/(?<ServerId>s-[a-f0-9]{17})',
        captureGroups: ['Account', 'ServerId'],
    },
    'AWS::Transfer::User': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):user/(?<ServerId>s-[a-f0-9]{17})/(?<UserName>[\\w][\\w@.-]{2,99})',
        captureGroups: ['Account', 'ServerId', 'UserName'],
    },
    'AWS::Transfer::WebApp': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):webapp/(?<WebAppId>[^/:]+)',
        captureGroups: ['AccountId', 'WebAppId'],
    },
    'AWS::Transfer::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):transfer:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):workflow/(?<WorkflowId>w-[a-f0-9]{17})',
        captureGroups: ['Account', 'WorkflowId'],
    },
    'AWS::VerifiedPermissions::PolicyStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):verifiedpermissions::(?<AccountId>[0-9]{12}):policy-store/(?<PolicyStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'PolicyStoreId'],
    },
    'AWS::VoiceID::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):voiceid:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domain/(?<DomainId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainId'],
    },
    'AWS::VpcLattice::AccessLogSubscription': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):accesslogsubscription/(?<AccessLogSubscriptionId>[^/:]+)',
        captureGroups: ['AccountId', 'AccessLogSubscriptionId'],
    },
    'AWS::VpcLattice::DomainVerification': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):domainverification/(?<DomainVerificationId>[^/:]+)',
        captureGroups: ['AccountId', 'DomainVerificationId'],
    },
    'AWS::VpcLattice::Listener': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceId>[^/:]+)/listener/(?<ListenerId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceId', 'ListenerId'],
    },
    'AWS::VpcLattice::ResourceConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resourceconfiguration/(?<ResourceConfigurationId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceConfigurationId'],
    },
    'AWS::VpcLattice::ResourceGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resourcegateway/(?<ResourceGatewayId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceGatewayId'],
    },
    'AWS::VpcLattice::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceId>[^/:]+)/listener/(?<ListenerId>[^/:]+)/rule/(?<RuleId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceId', 'ListenerId', 'RuleId'],
    },
    'AWS::VpcLattice::Service': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceId'],
    },
    'AWS::VpcLattice::ServiceNetwork': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):servicenetwork/(?<ServiceNetworkId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceNetworkId'],
    },
    'AWS::VpcLattice::ServiceNetworkResourceAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):servicenetworkresourceassociation/(?<ServiceNetworkResourceAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceNetworkResourceAssociationId'],
    },
    'AWS::VpcLattice::ServiceNetworkServiceAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):servicenetworkserviceassociation/(?<ServiceNetworkServiceAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceNetworkServiceAssociationId'],
    },
    'AWS::VpcLattice::ServiceNetworkVpcAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):servicenetworkvpcassociation/(?<ServiceNetworkVpcAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceNetworkVpcAssociationId'],
    },
    'AWS::VpcLattice::TargetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):targetgroup/(?<TargetGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'TargetGroupId'],
    },
    'AWS::WAF::ByteMatchSet': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):bytematchset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::IPSet': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):ipset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::Rule': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):rule/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::SizeConstraintSet': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):sizeconstraintset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::SqlInjectionMatchSet': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):sqlinjectionset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::WebACL': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):webacl/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAF::XssMatchSet': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):waf::(?<AccountId>[0-9]{12}):xssmatchset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::ByteMatchSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bytematchset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::GeoMatchSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):geomatchset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::IPSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ipset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::RateBasedRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ratebasedrule/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::RegexPatternSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):regexpatternset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rule/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::SizeConstraintSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sizeconstraintset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::SqlInjectionMatchSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sqlinjectionset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::WebACL': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):webacl/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFRegional::XssMatchSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):waf-regional:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):xssmatchset/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::WAFv2::IPSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wafv2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<Scope>[^/:]+)/ipset/(?<Name>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Scope', 'Name', 'Id'],
    },
    'AWS::WAFv2::RegexPatternSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wafv2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<Scope>[^/:]+)/regexpatternset/(?<Name>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Scope', 'Name', 'Id'],
    },
    'AWS::WAFv2::RuleGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wafv2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<Scope>[^/:]+)/rulegroup/(?<Name>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Scope', 'Name', 'Id'],
    },
    'AWS::WAFv2::WebACL': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wafv2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):(?<Scope>[^/:]+)/webacl/(?<Name>[^/:]+)/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Scope', 'Name', 'Id'],
    },
    'AWS::Wisdom::AIAgent': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ai-agent/(?<AssistantId>[^/:]+)/(?<AIAgentId>[^/:]+)',
        captureGroups: ['AccountId', 'AssistantId', 'AIAgentId'],
    },
    'AWS::Wisdom::AIGuardrail': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ai-guardrail/(?<AssistantId>[^/:]+)/(?<AIGuardrailId>[^/:]+)',
        captureGroups: ['AccountId', 'AssistantId', 'AIGuardrailId'],
    },
    'AWS::Wisdom::AIPrompt': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ai-prompt/(?<AssistantId>[^/:]+)/(?<AIPromptId>[^/:]+)',
        captureGroups: ['AccountId', 'AssistantId', 'AIPromptId'],
    },
    'AWS::Wisdom::Assistant': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):assistant/(?<AssistantId>[^/:]+)',
        captureGroups: ['AccountId', 'AssistantId'],
    },
    'AWS::Wisdom::AssistantAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):association/(?<AssistantId>[^/:]+)/(?<AssistantAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'AssistantId', 'AssistantAssociationId'],
    },
    'AWS::Wisdom::KnowledgeBase': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):knowledge-base/(?<KnowledgeBaseId>[^/:]+)',
        captureGroups: ['AccountId', 'KnowledgeBaseId'],
    },
    'AWS::Wisdom::MessageTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):message-template/(?<KnowledgeBaseId>[^/:]+)/(?<MessageTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'KnowledgeBaseId', 'MessageTemplateId'],
    },
    'AWS::Wisdom::QuickResponse': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):wisdom:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):quick-response/(?<KnowledgeBaseId>[^/:]+)/(?<QuickResponseId>[^/:]+)',
        captureGroups: ['AccountId', 'KnowledgeBaseId', 'QuickResponseId'],
    },
    'AWS::WorkSpaces::ConnectionAlias': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connectionalias/(?<ConnectionAliasId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectionAliasId'],
    },
    'AWS::WorkSpaces::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId'],
    },
    'AWS::WorkSpaces::WorkspacesPool': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspacespool/(?<PoolId>[^:/]+)',
        captureGroups: ['AccountId', 'PoolId'],
    },
    'AWS::WorkSpacesThinClient::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):thinclient:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentId>[^:/]+)',
        captureGroups: ['AccountId', 'EnvironmentId'],
    },
    'AWS::WorkSpacesWeb::BrowserSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):browserSettings/(?<BrowserSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'BrowserSettingsId'],
    },
    'AWS::WorkSpacesWeb::DataProtectionSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dataProtectionSettings/(?<DataProtectionSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'DataProtectionSettingsId'],
    },
    'AWS::WorkSpacesWeb::IdentityProvider': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):identityProvider/(?<PortalId>[^/:]+)/(?<IdentityProviderId>[^/:]+)',
        captureGroups: ['AccountId', 'PortalId', 'IdentityProviderId'],
    },
    'AWS::WorkSpacesWeb::IpAccessSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):ipAccessSettings/(?<IpAccessSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'IpAccessSettingsId'],
    },
    'AWS::WorkSpacesWeb::NetworkSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):networkSettings/(?<NetworkSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'NetworkSettingsId'],
    },
    'AWS::WorkSpacesWeb::Portal': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):portal/(?<PortalId>[a-fA-F0-9\\-]{36})',
        captureGroups: ['AccountId', 'PortalId'],
    },
    'AWS::WorkSpacesWeb::SessionLogger': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sessionLogger/(?<SessionLoggerId>[^/:]+)',
        captureGroups: ['AccountId', 'SessionLoggerId'],
    },
    'AWS::WorkSpacesWeb::TrustStore': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):trustStore/(?<TrustStoreId>[^/:]+)',
        captureGroups: ['AccountId', 'TrustStoreId'],
    },
    'AWS::WorkSpacesWeb::UserAccessLoggingSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):userAccessLoggingSettings/(?<UserAccessLoggingSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'UserAccessLoggingSettingsId'],
    },
    'AWS::WorkSpacesWeb::UserSettings': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):userSettings/(?<UserSettingsId>[^/:]+)',
        captureGroups: ['AccountId', 'UserSettingsId'],
    },
    'AWS::WorkspacesInstances::WorkspaceInstance': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-instances:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspaceinstance/(?<WorkspaceInstanceId>[^:/]+)',
        captureGroups: ['AccountId', 'WorkspaceInstanceId'],
    },
    'AWS::XRay::Group': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):xray:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):group/(?<GroupName>[^/:]+)',
        captureGroups: ['AccountId', 'GroupName'],
    },
    'AWS::XRay::SamplingRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):xray:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):sampling-rule/(?<SamplingRuleName>[^/:]+)',
        captureGroups: ['Account', 'SamplingRuleName'],
    },
};

export function arexTypeToCfnType(arexType: string): string | undefined {
    return arexToCfnTypeMap[arexType];
}

export function cfnTypeToArexType(cfnType: string): string | undefined {
    for (const [arex, cfn] of Object.entries(arexToCfnTypeMap)) {
        if (cfn === cfnType) return arex;
    }
    return undefined;
}

export function getSearchableResourceTypes(): string[] {
    return Object.values(arexToCfnTypeMap);
}

export function getArnMetadata(cfnType: string): { arnRegex: string; captureGroups: string[] } | undefined {
    return arnMetadataMap[cfnType];
}

export function extractIdentifierFromArn(cfnType: string, arn: string): string | undefined {
    const metadata = arnMetadataMap[cfnType];
    if (!metadata) {
        return arn; // Fallback to full ARN
    }

    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(metadata.arnRegex);
    const match = regex.exec(arn);
    if (!match?.groups) {
        return arn;
    }

    // Build identifier from capture groups (excluding Account/AccountId)
    const groups = match.groups;
    const parts = metadata.captureGroups
        .filter((g) => g !== 'AccountId' && g !== 'Account')
        .map((g) => groups[g])
        .filter(Boolean);

    // If no non-account parts, use full ARN (ARN-as-identifier case)
    return parts.length > 0 ? parts.join('|') : arn;
}

/**
 * Parse ARN to a map of primary identifier properties for Cloud Control API.
 * Handles edge cases like ARN-as-identifier, Account mapping, and Id->UUID mapping.
 */
export function parseArnToIdentifierMap(
    arn: string,
    cfnType: string,
    primaryIdentifiers: string[],
): Record<string, string> | undefined {
    const metadata = arnMetadataMap[cfnType];
    if (!metadata?.arnRegex) {
        return undefined;
    }

    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(metadata.arnRegex);
    const match = regex.exec(arn);
    if (!match?.groups) {
        return undefined;
    }

    const identifier: Record<string, string> = {};
    const remainingPrimaryIds = new Set(primaryIdentifiers);
    const remainingComponents = new Set(metadata.captureGroups);

    // Handle ARN-as-primary-ID (fields ending with "arn")
    for (const primaryId of primaryIdentifiers) {
        if (primaryId.toLowerCase().endsWith('arn')) {
            identifier[primaryId] = arn;
            remainingPrimaryIds.delete(primaryId);
        }
    }

    // Exact matches
    for (const component of metadata.captureGroups) {
        if (remainingPrimaryIds.has(component)) {
            const value = match.groups[component];
            if (value) {
                identifier[component] = value;
                remainingPrimaryIds.delete(component);
                remainingComponents.delete(component);
            }
        }
    }

    // Special case: Account/AccountId components
    for (const accountComponent of ['Account', 'AccountId']) {
        if (remainingComponents.has(accountComponent)) {
            let matched = false;
            for (const primaryId of remainingPrimaryIds) {
                if (primaryId.toLowerCase().includes('account')) {
                    const value = match.groups[accountComponent];
                    if (value) {
                        identifier[primaryId] = value;
                        remainingPrimaryIds.delete(primaryId);
                        remainingComponents.delete(accountComponent);
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                remainingComponents.delete(accountComponent);
            }
        }
    }

    // Special case: Id -> UUID
    if (remainingPrimaryIds.has('Id') && remainingComponents.has('UUID')) {
        const value = match.groups['UUID'];
        if (value) {
            identifier['Id'] = value;
            remainingPrimaryIds.delete('Id');
            remainingComponents.delete('UUID');
        }
    }

    // 1-to-1 fallback
    if (remainingComponents.size === 1 && remainingPrimaryIds.size === 1) {
        const component = [...remainingComponents][0];
        const primaryId = [...remainingPrimaryIds][0];
        const value = match.groups[component];
        if (value) {
            identifier[primaryId] = value;
        }
    }

    return identifier;
}
