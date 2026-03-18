import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { RelationshipSchemaService } from '../../../src/services/RelationshipSchemaService';

describe('RelationshipSchemaService', () => {
    // Use the actual schema file path
    const schemaPath = join(process.cwd(), 'assets', 'relationship_schemas.json');
    const service = new RelationshipSchemaService(schemaPath);

    describe('getRelationshipsForResourceType', () => {
        it('should return relationships for known resource type', () => {
            const result = service.getRelationshipsForResourceType('AWS::ACMPCA::CertificateAuthority');

            expect(result).toBeDefined();
            expect(result?.resourceType).toBe('AWS::ACMPCA::CertificateAuthority');
        });

        it('should return undefined for unknown resource type', () => {
            const result = service.getRelationshipsForResourceType('AWS::Unknown::Resource');

            expect(result).toBeUndefined();
        });
    });

    describe('getAllRelatedResourceTypes', () => {
        it('should return related types for known resource', () => {
            const result = service.getAllRelatedResourceTypes('AWS::ACMPCA::CertificateAuthority');

            expect(result).toBeInstanceOf(Set);
        });

        it('should return empty set for unknown resource type', () => {
            const result = service.getAllRelatedResourceTypes('AWS::Unknown::Resource');

            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBe(0);
        });

        it('should include incoming references (types that reference the given type)', () => {
            // AWS::IAM::Role is referenced by many types (Lambda, ECS, etc.)
            // but IAM::Role's own properties only reference a few types
            const result = service.getAllRelatedResourceTypes('AWS::IAM::Role');

            expect(result).toBeInstanceOf(Set);
            // Lambda::Function references IAM::Role in its Role property
            expect(result.has('AWS::Lambda::Function')).toBe(true);
        });

        it('should include both outgoing and incoming references', () => {
            // IAM::Role's own properties reference ManagedPolicy (outgoing)
            // AND Lambda::Function references IAM::Role (incoming)
            const result = service.getAllRelatedResourceTypes('AWS::IAM::Role');

            // Outgoing: IAM::Role -> ManagedPolicyArns -> ManagedPolicy
            expect(result.has('AWS::IAM::ManagedPolicy')).toBe(true);
            // Incoming: Lambda::Function -> Role -> IAM::Role
            expect(result.has('AWS::Lambda::Function')).toBe(true);
        });

        it('should include incoming references for types with no outgoing relationships', () => {
            // AWS::EC2::VPC has no entry in relationship_schemas.json (no outgoing)
            // but many types reference it (Subnet, SecurityGroup, etc.)
            const result = service.getAllRelatedResourceTypes('AWS::EC2::VPC');

            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBeGreaterThan(0);
            // EC2::Subnet references VPC in its VpcId property
            expect(result.has('AWS::EC2::Subnet')).toBe(true);
        });
    });

    describe('getRelationshipContext', () => {
        it('should return context string for resource types', () => {
            const result = service.getRelationshipContext(['AWS::ACMPCA::CertificateAuthority']);

            expect(typeof result).toBe('string');
        });

        it('should return empty string for unknown resource types', () => {
            const result = service.getRelationshipContext(['AWS::Unknown::Resource']);

            expect(result).toBe('');
        });

        it('should handle empty array', () => {
            const result = service.getRelationshipContext([]);

            expect(result).toBe('');
        });
    });

    describe('extractResourceTypesFromTemplate', () => {
        it('should extract AWS resource types from template', () => {
            const template = `
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
  MyFunction:
    Type: "AWS::Lambda::Function"
`;
            const result = service.extractResourceTypesFromTemplate(template);

            expect(result).toContain('AWS::S3::Bucket');
            expect(result).toContain('AWS::Lambda::Function');
        });

        it('should return empty array for template without resources', () => {
            const template = 'AWSTemplateFormatVersion: "2010-09-09"';
            const result = service.extractResourceTypesFromTemplate(template);

            expect(result).toEqual([]);
        });

        it('should handle quoted and unquoted resource types', () => {
            const template = `
Type: AWS::EC2::Instance
Type: 'AWS::IAM::Role'
Type: "AWS::SNS::Topic"
`;
            const result = service.extractResourceTypesFromTemplate(template);

            expect(result).toContain('AWS::EC2::Instance');
            expect(result).toContain('AWS::IAM::Role');
            expect(result).toContain('AWS::SNS::Topic');
        });

        it('should deduplicate resource types', () => {
            const template = `
Type: AWS::S3::Bucket
Type: AWS::S3::Bucket
`;
            const result = service.extractResourceTypesFromTemplate(template);

            const bucketCount = result.filter((t) => t === 'AWS::S3::Bucket').length;
            expect(bucketCount).toBe(1);
        });
    });

    describe('constructor', () => {
        it('should handle non-existent schema file gracefully', () => {
            const badService = new RelationshipSchemaService('/non/existent/path.json');
            const result = badService.getRelationshipsForResourceType('AWS::S3::Bucket');

            expect(result).toBeUndefined();
        });
    });
});
