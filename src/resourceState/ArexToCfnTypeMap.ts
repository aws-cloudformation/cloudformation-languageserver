/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Resource Explorer type to CloudFormation type mapping.
// Note: Ambiguous types are not included.
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
    'ec2:spot-fleet-request': 'AWS::EC2::SpotFleet',
    'ec2:subnet': 'AWS::EC2::Subnet',
    'ec2:traffic-mirror-filter': 'AWS::EC2::TrafficMirrorFilter',
    'ec2:traffic-mirror-filter-rule': 'AWS::EC2::TrafficMirrorFilterRule',
    'ec2:traffic-mirror-session': 'AWS::EC2::TrafficMirrorSession',
    'ec2:traffic-mirror-target': 'AWS::EC2::TrafficMirrorTarget',
    'ec2:transit-gateway': 'AWS::EC2::TransitGateway',
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
    'rds:db-proxy': 'AWS::RDS::DBProxy',
    'rds:db-proxy-endpoint': 'AWS::RDS::DBProxyEndpoint',
    'rds:es': 'AWS::DocDB::EventSubscription',
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
    'ses:contact-list': 'AWS::SES::ContactList',
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

// ARN metadata for extracting identifiers.
// Note: This is not an authoritative or complete dataset.
const arnMetadataMap: Record<string, { arnRegex: string; captureGroups: string[] }> = {
    'AWS::ACMPCA::CertificateAuthority': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):acm-pca:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificate-authority/(?<CertificateAuthorityId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateAuthorityId'],
    },
    'AWS::APS::RuleGroupsNamespace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):rulegroupsnamespace/(?<WorkspaceId>[^/:]+)/(?<Namespace>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId', 'Namespace'],
    },
    'AWS::APS::Workspace': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aps:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workspace/(?<WorkspaceId>[^/:]+)',
        captureGroups: ['AccountId', 'WorkspaceId'],
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
    'AWS::ApiGateway::Deployment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/deployments/(?<DeploymentId>[^/:]+)',
        captureGroups: ['RestApiId', 'DeploymentId'],
    },
    'AWS::ApiGateway::Method': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/restapis/(?<RestApiId>[^/:]+)/resources/(?<ResourceId>[^/:]+)/methods/(?<HttpMethodType>[^/:]+)',
        captureGroups: ['RestApiId', 'ResourceId', 'HttpMethodType'],
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
    'AWS::ApiGateway::VpcLink': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/vpclinks/(?<VpcLinkId>[^/:]+)',
        captureGroups: ['VpcLinkId'],
    },
    'AWS::ApiGatewayV2::Api': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)',
        captureGroups: ['ApiId'],
    },
    'AWS::ApiGatewayV2::Route': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):apigateway:(?<Region>[a-z0-9-]+)::/apis/(?<ApiId>[^/:]+)/routes/(?<RouteId>[^/:]+)',
        captureGroups: ['ApiId', 'RouteId'],
    },
    'AWS::AppConfig::Application': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):application/(?<ApplicationId>[^/:]+)',
        captureGroups: ['AccountId', 'ApplicationId'],
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
    'AWS::AppConfig::ExtensionAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appconfig:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):extensionassociation/(?<ExtensionAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ExtensionAssociationId'],
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
    'AWS::AppStream::AppBlock': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):appstream:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):app-block/(?<AppBlockName>[^/:]+)',
        captureGroups: ['AccountId', 'AppBlockName'],
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
    'AWS::Backup::BackupPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):backup-plan:(?<BackupPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'BackupPlanId'],
    },
    'AWS::Backup::ReportPlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):backup:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):report-plan:(?<ReportPlanName>[^/:]+)-(?<ReportPlanId>[^/:]+)',
        captureGroups: ['AccountId', 'ReportPlanName', 'ReportPlanId'],
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
    'AWS::CE::AnomalyMonitor': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ce::(?<AccountId>[0-9]{12}):anomalymonitor/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::CE::AnomalySubscription': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):ce::(?<AccountId>[0-9]{12}):anomalysubscription/(?<Identifier>[^/:]+)',
        captureGroups: ['AccountId', 'Identifier'],
    },
    'AWS::CertificateManager::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):acm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):certificate/(?<CertificateId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateId'],
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
    'AWS::CloudFront::CachePolicy': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):cache-policy/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::CloudFront::CloudFrontOriginAccessIdentity': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):origin-access-identity/(?<Id>[^/:]+)',
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
    'AWS::CloudFront::Function': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):cloudfront::(?<AccountId>[0-9]{12}):function/(?<Name>[^/:]+)',
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
    'AWS::CodeArtifact::Repository': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codeartifact:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):repository/(?<DomainName>[^/:]+)/(?<RepositoryName>[^/:]+)',
        captureGroups: ['AccountId', 'DomainName', 'RepositoryName'],
    },
    'AWS::CodeBuild::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codebuild:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName'],
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
    'AWS::CodeStarConnections::Connection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):codestar-connections:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):connection/(?<ConnectionId>[^/:]+)',
        captureGroups: ['AccountId', 'ConnectionId'],
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
    'AWS::Config::ConfigRule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):config:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):config-rule/(?<ConfigRuleId>[^:]+)',
        captureGroups: ['AccountId', 'ConfigRuleId'],
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
    'AWS::Connect::PhoneNumber': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):phone-number/(?<PhoneNumberId>[^/:]+)',
        captureGroups: ['AccountId', 'PhoneNumberId'],
    },
    'AWS::Connect::QuickConnect': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/transfer-destination/(?<QuickConnectId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'QuickConnectId'],
    },
    'AWS::Connect::Rule': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/rule/(?<RuleId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'RuleId'],
    },
    'AWS::Connect::TaskTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/task-template/(?<TaskTemplateId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'TaskTemplateId'],
    },
    'AWS::Connect::User': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):connect:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):instance/(?<InstanceId>[^/:]+)/agent/(?<UserId>[^/:]+)',
        captureGroups: ['AccountId', 'InstanceId', 'UserId'],
    },
    'AWS::CustomerProfiles::Domain': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):profile:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):domains/(?<DomainName>[a-zA-Z0-9_-]+)',
        captureGroups: ['Account', 'DomainName'],
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
    'AWS::DMS::Certificate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cert:(?<CertificateId>[^/:]+)',
        captureGroups: ['AccountId', 'CertificateId'],
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
    'AWS::DataSync::Task': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):datasync:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):task/(?<TaskId>[^:/]+)',
        captureGroups: ['AccountId', 'TaskId'],
    },
    'AWS::Detective::Graph': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):detective:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):graph:(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
    },
    'AWS::DeviceFarm::InstanceProfile': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):devicefarm:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):instanceprofile:(?<InstanceProfileId>[^/:]+)',
        captureGroups: ['Account', 'InstanceProfileId'],
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
    'AWS::DocDB::DBCluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster:(?<DbClusterInstanceName>[^/:]+)',
        captureGroups: ['AccountId', 'DbClusterInstanceName'],
    },
    'AWS::DynamoDB::Table': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):dynamodb:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):table/(?<TableName>[^/:]+)',
        captureGroups: ['AccountId', 'TableName'],
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
    'AWS::EC2::TransitGatewayConnectPeer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):transit-gateway-connect-peer/(?<TransitGatewayConnectPeerId>[^/:]+)',
        captureGroups: ['AccountId', 'TransitGatewayConnectPeerId'],
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
    'AWS::EC2::VPCEndpoint': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpc-endpoint/(?<VpcEndpointId>[^/:]+)',
        captureGroups: ['Account', 'VpcEndpointId'],
    },
    'AWS::EC2::VPCPeeringConnection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ec2:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):vpc-peering-connection/(?<VpcPeeringConnectionId>[^/:]+)',
        captureGroups: ['Account', 'VpcPeeringConnectionId'],
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
    'AWS::EKS::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):eks:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster/(?<ClusterName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterName'],
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
    'AWS::EventSchemas::Discoverer': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):schemas:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):discoverer/(?<DiscovererId>[^/:]+)',
        captureGroups: ['AccountId', 'DiscovererId'],
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
    'AWS::FIS::ExperimentTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):experiment-template/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::FSx::FileSystem': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):fsx:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):file-system/(?<ResourcePath>[^/:]+)',
        captureGroups: ['AccountId', 'ResourcePath'],
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
    'AWS::GlobalAccelerator::Accelerator': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):globalaccelerator::(?<Account>[0-9]{12}):accelerator/(?<AcceleratorId>[^/:]+)',
        captureGroups: ['Account', 'AcceleratorId'],
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
    'AWS::Glue::Crawler': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):crawler/(?<CrawlerName>.+)',
        captureGroups: ['AccountId', 'CrawlerName'],
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
    'AWS::Glue::Job': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):job/(?<JobName>.+)',
        captureGroups: ['AccountId', 'JobName'],
    },
    'AWS::Glue::MLTransform': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):mlTransform/(?<TransformId>[^/:]+)',
        captureGroups: ['AccountId', 'TransformId'],
    },
    'AWS::Glue::Registry': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):glue:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):registry/(?<RegistryName>[^/:]+)',
        captureGroups: ['AccountId', 'RegistryName'],
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
    'AWS::Greengrass::CoreDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/cores/(?<CoreDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'CoreDefinitionId'],
    },
    'AWS::Greengrass::DeviceDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/devices/(?<DeviceDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceDefinitionId'],
    },
    'AWS::Greengrass::FunctionDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/functions/(?<FunctionDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'FunctionDefinitionId'],
    },
    'AWS::Greengrass::Group': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/groups/(?<GroupId>[^/:]+)',
        captureGroups: ['AccountId', 'GroupId'],
    },
    'AWS::Greengrass::LoggerDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/loggers/(?<LoggerDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'LoggerDefinitionId'],
    },
    'AWS::Greengrass::ResourceDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/resources/(?<ResourceDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceDefinitionId'],
    },
    'AWS::Greengrass::SubscriptionDefinition': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):/greengrass/definition/subscriptions/(?<SubscriptionDefinitionId>[^/:]+)',
        captureGroups: ['AccountId', 'SubscriptionDefinitionId'],
    },
    'AWS::GreengrassV2::ComponentVersion': {
        arnRegex:
            '^arn:(?<Partition>[a-z-]+):greengrass:(?<Region>[a-z0-9-]+):(?<Account>[0-9]{12}):components:(?<ComponentName>[a-zA-Z0-9-_.]+):versions:(?<ComponentVersion>[0-9a-zA-Z-.+]+)',
        captureGroups: ['Account', 'ComponentName', 'ComponentVersion'],
    },
    'AWS::GroundStation::Config': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):groundstation:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):config/(?<ConfigType>[^/:]+)/(?<ConfigId>[^/:]+)',
        captureGroups: ['AccountId', 'ConfigType', 'ConfigId'],
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
    'AWS::GuardDuty::ThreatIntelSet': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):guardduty:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):detector/(?<DetectorId>[^/:]+)/threatintelset/(?<ThreatIntelSetId>[^/:]+)',
        captureGroups: ['AccountId', 'DetectorId', 'ThreatIntelSetId'],
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
    'AWS::IVS::RecordingConfiguration': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ivs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):recording-configuration/(?<ResourceId>[^/:]+)',
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
    'AWS::Inspector::AssessmentTemplate': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):inspector:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):target/(?<TargetID>[^/:]+)/template/(?<TemplateID>[^/:]+)',
        captureGroups: ['AccountId', 'TargetID', 'TemplateID'],
    },
    'AWS::InspectorV2::Filter': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):inspector2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):owner/(?<OwnerId>[^:/]+)/filter/(?<FilterId>[^:/]+)',
        captureGroups: ['AccountId', 'OwnerId', 'FilterId'],
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
    'AWS::IoTFleetWise::DecoderManifest': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):decoder-manifest/(?<Name>[^/:]+)',
        captureGroups: ['AccountId', 'Name'],
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
    'AWS::IoTFleetWise::Vehicle': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotfleetwise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):vehicle/(?<VehicleId>[^/:]+)',
        captureGroups: ['AccountId', 'VehicleId'],
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
    'AWS::IoTSiteWise::Dashboard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotsitewise:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):dashboard/(?<DashboardId>[^/:]+)',
        captureGroups: ['AccountId', 'DashboardId'],
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
    'AWS::IoTWireless::WirelessGateway': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):iotwireless:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):WirelessGateway/(?<DeviceProfileId>[^/:]+)',
        captureGroups: ['AccountId', 'DeviceProfileId'],
    },
    'AWS::KMS::Key': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):kms:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):key/(?<KeyId>[^/:]+)',
        captureGroups: ['AccountId', 'KeyId'],
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
    'AWS::Kinesis::Stream': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):kinesis:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):stream/(?<StreamName>[^/:]+)',
        captureGroups: ['AccountId', 'StreamName'],
    },
    'AWS::KinesisAnalytics::Application': {
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
    'AWS::Lex::Bot': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):lex:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bot:(?<BotName>[^/:]+)',
        captureGroups: ['AccountId', 'BotName'],
    },
    'AWS::Lex::BotAlias': {
        arnRegex:
            'arn:(?<Partition>[^:/]+):lex:(?<Region>[^:/]+):(?<Account>[^:/]+):bot-alias/(?<BotId>[^:/]+)/(?<BotAliasId>[^:/]+)',
        captureGroups: ['Account', 'BotId', 'BotAliasId'],
    },
    'AWS::LicenseManager::Grant': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):license-manager::(?<AccountId>[0-9]{12}):grant:(?<GrantId>[^/:]+)',
        captureGroups: ['AccountId', 'GrantId'],
    },
    'AWS::Logs::Destination': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):destination:(?<DestinationName>[^:*]+)',
        captureGroups: ['AccountId', 'DestinationName'],
    },
    'AWS::Logs::LogGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):logs:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):log-group:(?<LogGroupName>[^:]+)',
        captureGroups: ['AccountId', 'LogGroupName'],
    },
    'AWS::M2::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):m2:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):env/(?<EnvironmentId>[^:/]+)',
        captureGroups: ['AccountId', 'EnvironmentId'],
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
    'AWS::MWAA::Environment': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):airflow:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):environment/(?<EnvironmentName>[^/:]+)',
        captureGroups: ['AccountId', 'EnvironmentName'],
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
    'AWS::Neptune::DBClusterParameterGroup': {
        arnRegex: 'arn:aws:rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):cluster-pg:(?<ClusterPGName>[^/:]+)',
        captureGroups: ['AccountId', 'ClusterPGName'],
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
    'AWS::Oam::Sink': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):oam:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):sink/(?<ResourceId>[^/:]+)',
        captureGroups: ['AccountId', 'ResourceId'],
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
    'AWS::Omics::Workflow': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):omics:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):workflow/(?<Id>[^/:]+)',
        captureGroups: ['AccountId', 'Id'],
    },
    'AWS::OpenSearchServerless::Collection': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):aoss:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):collection/(?<CollectionId>[^:/]+)',
        captureGroups: ['AccountId', 'CollectionId'],
    },
    'AWS::Panorama::Package': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):panorama:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):package/(?<PackageId>[^/:]+)',
        captureGroups: ['AccountId', 'PackageId'],
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
    'AWS::RDS::DBSecurityGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):secgrp:(?<SecurityGroupName>(?:default:)?[^/:]+)',
        captureGroups: ['AccountId', 'SecurityGroupName'],
    },
    'AWS::RDS::OptionGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rds:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):og:(?<OptionGroupName>[^/]+)',
        captureGroups: ['AccountId', 'OptionGroupName'],
    },
    'AWS::RUM::AppMonitor': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rum:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):appmonitor/(?<Name>[^:/]+)',
        captureGroups: ['AccountId', 'Name'],
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
    'AWS::Rekognition::Project': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):rekognition:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):project/(?<ProjectName>[^/:]+)/(?<CreationTimestamp>[^/:]+)',
        captureGroups: ['AccountId', 'ProjectName', 'CreationTimestamp'],
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
    'AWS::Route53::HealthCheck': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):route53:::healthcheck/(?<Id>[^/:]+)',
        captureGroups: ['Id'],
    },
    'AWS::Route53::HostedZone': {
        arnRegex: 'arn:(?<Partition>[a-z-]+):route53:::hostedzone/(?<Id>[^/:]+)',
        captureGroups: ['Id'],
    },
    'AWS::Route53RecoveryControl::Cluster': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):route53-recovery-control::(?<AccountId>[0-9]{12}):cluster/(?<ResourceId>[^:/]+)',
        captureGroups: ['AccountId', 'ResourceId'],
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
    'AWS::S3Express::DirectoryBucket': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):s3express:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):bucket/(?<BucketName>[^:/]+)',
        captureGroups: ['AccountId', 'BucketName'],
    },
    'AWS::SES::ContactList': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ses:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):contact-list/(?<ContactListName>[^/:]+)',
        captureGroups: ['AccountId', 'ContactListName'],
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
    'AWS::SSM::ResourceDataSync': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):resource-data-sync/(?<SyncName>[^/:]+)',
        captureGroups: ['AccountId', 'SyncName'],
    },
    'AWS::SSMIncidents::ResponsePlan': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):ssm-incidents::(?<AccountId>[0-9]{12}):response-plan/(?<ResponsePlan>[^/:]+)',
        captureGroups: ['AccountId', 'ResponsePlan'],
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
    'AWS::SageMaker::ModelCard': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):model-card/(?<ModelCardName>[^/:]+)',
        captureGroups: ['AccountId', 'ModelCardName'],
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
    'AWS::SageMaker::Pipeline': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):sagemaker:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):pipeline/(?<PipelineName>[^/:]+)',
        captureGroups: ['AccountId', 'PipelineName'],
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
    'AWS::VpcLattice::Listener': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):service/(?<ServiceId>[^/:]+)/listener/(?<ListenerId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceId', 'ListenerId'],
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
    'AWS::VpcLattice::ServiceNetworkServiceAssociation': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):servicenetworkserviceassociation/(?<ServiceNetworkServiceAssociationId>[^/:]+)',
        captureGroups: ['AccountId', 'ServiceNetworkServiceAssociationId'],
    },
    'AWS::VpcLattice::TargetGroup': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):vpc-lattice:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):targetgroup/(?<TargetGroupId>[^/:]+)',
        captureGroups: ['AccountId', 'TargetGroupId'],
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
    'AWS::WorkSpacesWeb::Portal': {
        arnRegex:
            'arn:(?<Partition>[a-z-]+):workspaces-web:(?<Region>[a-z0-9-]+):(?<AccountId>[0-9]{12}):portal/(?<PortalId>[a-fA-F0-9\\-]{36})',
        captureGroups: ['AccountId', 'PortalId'],
    },
};

// Reverse lookup map for CFN -> AREX type conversion
const cfnToArexTypeMap: Record<string, string> = Object.fromEntries(
    Object.entries(arexToCfnTypeMap).map(([arex, cfn]) => [cfn, arex]),
);

export function arexTypeToCfnType(arexType: string): string | undefined {
    return arexToCfnTypeMap[arexType];
}

export function cfnTypeToArexType(cfnType: string): string | undefined {
    return cfnToArexTypeMap[cfnType];
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
