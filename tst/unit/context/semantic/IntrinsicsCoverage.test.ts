import { describe, it, expect } from 'vitest';
import { referencedLogicalIds } from '../../../../src/context/semantic/LogicalIdReferenceFinder';
import { DocumentType } from '../../../../src/document/Document';

describe('Intrinsic Function Coverage', () => {
    describe('YAML', () => {
        // Ref - references parameters, resources, pseudo-parameters
        describe('Ref', () => {
            it('!Ref short form', () => {
                const result = referencedLogicalIds('!Ref MyResource', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('Ref: long form', () => {
                const result = referencedLogicalIds('Ref: MyResource', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        // Fn::GetAtt - gets attributes from resources
        describe('Fn::GetAtt', () => {
            it('!GetAtt dot notation', () => {
                const result = referencedLogicalIds('!GetAtt MyResource.Arn', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('!GetAtt array notation', () => {
                const result = referencedLogicalIds('!GetAtt [MyResource, Arn]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('Fn::GetAtt: array', () => {
                const result = referencedLogicalIds('Fn::GetAtt: [MyResource, Arn]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('Fn::GetAtt: string', () => {
                const result = referencedLogicalIds('Fn::GetAtt: MyResource.Arn', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('!GetAtt quoted dot notation', () => {
                const result = referencedLogicalIds('!GetAtt "MyResource.Arn"', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('!GetAtt quoted array notation', () => {
                const result = referencedLogicalIds('!GetAtt ["MyResource", "Arn"]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        // Fn::Sub - substitutes variables in strings
        describe('Fn::Sub', () => {
            it('!Sub simple', () => {
                const result = referencedLogicalIds('!Sub "${MyVar}-suffix"', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyVar']));
            });

            it('!Sub with mapping', () => {
                const result = referencedLogicalIds(
                    '!Sub ["${A}-${B}", {A: !Ref ResA, B: !Ref ResB}]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['ResA', 'ResB']));
            });

            it('Fn::Sub: long form', () => {
                const result = referencedLogicalIds('Fn::Sub: "${MyVar}"', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyVar']));
            });

            it('${Resource.Attr} syntax', () => {
                const result = referencedLogicalIds('!Sub "${MyBucket.Arn}"', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyBucket']));
            });
        });

        // Fn::FindInMap - looks up values in mappings
        describe('Fn::FindInMap', () => {
            it('!FindInMap', () => {
                const result = referencedLogicalIds('!FindInMap [MyMapping, Key1, Key2]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyMapping']));
            });

            it('Fn::FindInMap:', () => {
                const result = referencedLogicalIds('Fn::FindInMap: [MyMapping, Key1, Key2]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyMapping']));
            });
        });

        // Fn::If - conditional values
        describe('Fn::If', () => {
            it('!If', () => {
                const result = referencedLogicalIds('!If [MyCondition, yes, no]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });

            it('Fn::If:', () => {
                const result = referencedLogicalIds('Fn::If: [MyCondition, yes, no]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });

            it('Fn::If with space before colon', () => {
                const result = referencedLogicalIds('Fn::If : [MyCondition, yes, no]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // Condition - resource condition attribute
        describe('Condition', () => {
            it('!Condition', () => {
                const result = referencedLogicalIds('!Condition MyCondition', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });

            it('Condition:', () => {
                const result = referencedLogicalIds('Condition: MyCondition', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // DependsOn - resource dependencies
        describe('DependsOn', () => {
            it('DependsOn: single', () => {
                const result = referencedLogicalIds('DependsOn: MyResource', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('DependsOn: inline array', () => {
                const result = referencedLogicalIds('DependsOn: [Res1, Res2]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Res1', 'Res2']));
            });

            it('DependsOn: list', () => {
                const result = referencedLogicalIds('DependsOn:\n  - Res1\n  - Res2', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Res1', 'Res2']));
            });
        });

        // Fn::Base64 - encodes to base64 (no direct refs, only nested)
        describe('Fn::Base64', () => {
            it('!Base64 with nested !Ref', () => {
                const result = referencedLogicalIds('!Base64 !Ref MyParam', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::Cidr - generates CIDR blocks (no direct refs, only nested)
        describe('Fn::Cidr', () => {
            it('!Cidr with nested !GetAtt', () => {
                const result = referencedLogicalIds('!Cidr [!GetAtt MyVpc.CidrBlock, 6, 8]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyVpc']));
            });
        });

        // Fn::GetAZs - gets availability zones (no logical ID refs)
        describe('Fn::GetAZs', () => {
            it('!GetAZs with !Ref', () => {
                const result = referencedLogicalIds('!GetAZs !Ref MyRegion', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyRegion']));
            });
        });

        // Fn::ImportValue - imports from other stacks (no local refs)
        describe('Fn::ImportValue', () => {
            it('!ImportValue with !Sub', () => {
                const result = referencedLogicalIds('!ImportValue !Sub "${MyStack}-VpcId"', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyStack']));
            });
        });

        // Fn::Join - joins strings (no direct refs, only nested)
        describe('Fn::Join', () => {
            it('!Join with !Ref', () => {
                const result = referencedLogicalIds('!Join ["-", [!Ref Prefix, !Ref Suffix]]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Prefix', 'Suffix']));
            });
        });

        // Fn::Length - gets length (no direct refs, only nested)
        describe('Fn::Length', () => {
            it('!Length with !Ref', () => {
                const result = referencedLogicalIds('!Length !Ref MyList', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyList']));
            });
        });

        // Fn::Select - selects from list (no direct refs, only nested)
        describe('Fn::Select', () => {
            it('!Select with !Ref', () => {
                const result = referencedLogicalIds('!Select [0, !Ref MyList]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyList']));
            });
        });

        // Fn::Split - splits string (no direct refs, only nested)
        describe('Fn::Split', () => {
            it('!Split with !Ref', () => {
                const result = referencedLogicalIds('!Split [",", !Ref MyString]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyString']));
            });
        });

        // Fn::ToJsonString - converts to JSON (no direct refs, only nested)
        describe('Fn::ToJsonString', () => {
            it('!ToJsonString with !Ref', () => {
                const result = referencedLogicalIds('!ToJsonString {Key: !Ref MyValue}', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyValue']));
            });
        });

        // Fn::Transform - invokes macros (no logical ID refs)
        describe('Fn::Transform', () => {
            it('!Transform with nested !Ref', () => {
                const result = referencedLogicalIds(
                    '!Transform {Name: MyMacro, Parameters: {Param: !Ref MyParam}}',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::And - logical AND (no direct refs, only nested)
        describe('Fn::And', () => {
            it('!And with !Condition', () => {
                const result = referencedLogicalIds('!And [!Condition Cond1, !Condition Cond2]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Fn::Equals - equality check (no direct refs, only nested)
        describe('Fn::Equals', () => {
            it('!Equals with !Ref', () => {
                const result = referencedLogicalIds('!Equals [!Ref MyParam, "value"]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::Not - logical NOT (no direct refs, only nested)
        describe('Fn::Not', () => {
            it('!Not with !Condition', () => {
                const result = referencedLogicalIds('!Not [!Condition MyCondition]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // Fn::Or - logical OR (no direct refs, only nested)
        describe('Fn::Or', () => {
            it('!Or with !Condition', () => {
                const result = referencedLogicalIds('!Or [!Condition Cond1, !Condition Cond2]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Fn::ForEach - loop construct
        describe('Fn::ForEach', () => {
            it('Fn::ForEach with !Sub', () => {
                const result = referencedLogicalIds(
                    'Fn::ForEach::Loop: [Id, [A, B], {"${Id}": {Prop: !Ref MyRef}}]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['Id', 'MyRef']));
            });
        });

        // Rules-only intrinsics
        describe('Rules intrinsics', () => {
            it('Fn::Contains with !Ref', () => {
                const result = referencedLogicalIds('Fn::Contains: [[a, b], !Ref MyParam]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyParam']));
            });

            it('Fn::EachMemberEquals with !Ref', () => {
                const result = referencedLogicalIds(
                    'Fn::EachMemberEquals: [!Ref MyList, "value"]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['MyList']));
            });

            it('Fn::EachMemberIn with !Ref', () => {
                const result = referencedLogicalIds('Fn::EachMemberIn: [!Ref MyList, [a, b]]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyList']));
            });

            it('Fn::ValueOf', () => {
                const result = referencedLogicalIds('Fn::ValueOf: [MyParam, Attr]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyParam']));
            });

            it('!ValueOf short form', () => {
                const result = referencedLogicalIds('!ValueOf [MyParam, Attr]', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyParam']));
            });

            it('Fn::RefAll with nested !If', () => {
                // Fn::RefAll takes a parameter type, but can be nested in conditions
                const result = referencedLogicalIds(
                    '!If [UseVpc, Fn::RefAll: AWS::EC2::VPC::Id, !Ref DefaultVpc]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['UseVpc', 'DefaultVpc']));
            });

            it('Fn::ValueOfAll with nested !If', () => {
                // Fn::ValueOfAll takes a parameter type, but can be nested in conditions
                const result = referencedLogicalIds(
                    '!If [UseTags, Fn::ValueOfAll: [AWS::EC2::VPC::Id, Tags], !Ref DefaultTags]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['UseTags', 'DefaultTags']));
            });

            it('Fn::Implies with nested conditions', () => {
                const result = referencedLogicalIds(
                    'Fn::Implies: [!Condition Cond1, !Condition Cond2]',
                    '',
                    DocumentType.YAML,
                );
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Multi-line YAML templates
        describe('Multi-line templates', () => {
            it('resource with nested properties', () => {
                const text = `MyBucket:
  Type: AWS::S3::Bucket
  Condition: IsProduction
  DependsOn:
    - MyRole
    - MyPolicy
  Properties:
    BucketName: !Ref BucketName
    Tags:
      - Key: Env
        Value: !Ref Environment
      - Key: Team
        Value: !Ref Owner`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(
                    new Set(['IsProduction', 'MyRole', 'MyPolicy', 'BucketName', 'Environment', 'Owner']),
                );
            });

            it('conditions block', () => {
                const text = `Conditions:
  IsProd: !Equals [!Ref Env, production]
  IsNotDev: !Not [!Condition IsDev]
  IsUsEast: !And
    - !Condition IsProd
    - !Equals [!Ref Region, east]
  HasFlag: !Or
    - !Condition IsProd
    - !Equals [!Ref Flag, yes]`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Env', 'IsDev', 'IsProd', 'Region', 'Flag']));
            });

            it('outputs block', () => {
                const text = `Outputs:
  VpcId:
    Value: !Ref MyVpc
    Export:
      Name: !Sub "\${StackName}-VpcId"
  SubnetId:
    Value: !GetAtt MySubnet.SubnetId
    Condition: HasSubnet`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyVpc', 'StackName', 'MySubnet', 'HasSubnet']));
            });

            it('Fn::Sub with multi-line mapping', () => {
                const text = `!Sub
  - "arn:aws:s3:::\${BucketName}/*"
  - BucketName: !Ref MyBucket
    AccountId: !Ref AWS::AccountId`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['BucketName', 'MyBucket']));
            });

            it('nested Fn::If', () => {
                const text = `Value: !If
  - IsProduction
  - !If
    - HasBackup
    - !Ref ProdBackupBucket
    - !Ref ProdBucket
  - !Ref DevBucket`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(
                    new Set(['IsProduction', 'HasBackup', 'ProdBackupBucket', 'ProdBucket', 'DevBucket']),
                );
            });
        });
    });

    describe('JSON', () => {
        // Ref
        describe('Ref', () => {
            it('"Ref"', () => {
                const result = referencedLogicalIds('{"Ref": "MyResource"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        // Fn::GetAtt
        describe('Fn::GetAtt', () => {
            it('"Fn::GetAtt" array', () => {
                const result = referencedLogicalIds('{"Fn::GetAtt": ["MyResource", "Arn"]}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('"Fn::GetAtt" string', () => {
                const result = referencedLogicalIds('{"Fn::GetAtt": "MyResource.Arn"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        // Fn::Sub
        describe('Fn::Sub', () => {
            it('"Fn::Sub" simple', () => {
                const result = referencedLogicalIds('{"Fn::Sub": "${MyVar}"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyVar']));
            });

            it('"Fn::Sub" with mapping', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Sub": ["${A}", {"A": {"Ref": "ResA"}}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['ResA']));
            });
        });

        // Fn::FindInMap
        describe('Fn::FindInMap', () => {
            it('"Fn::FindInMap"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::FindInMap": ["MyMapping", "K1", "K2"]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyMapping']));
            });
        });

        // Fn::If
        describe('Fn::If', () => {
            it('"Fn::If"', () => {
                const result = referencedLogicalIds('{"Fn::If": ["MyCondition", "yes", "no"]}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // Condition
        describe('Condition', () => {
            it('"Condition"', () => {
                const result = referencedLogicalIds('"Condition": "MyCondition"', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // DependsOn
        describe('DependsOn', () => {
            it('"DependsOn" single', () => {
                const result = referencedLogicalIds('"DependsOn": "MyResource"', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('"DependsOn" array', () => {
                const result = referencedLogicalIds('"DependsOn": ["Res1", "Res2"]', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['Res1', 'Res2']));
            });
        });

        // Fn::Base64
        describe('Fn::Base64', () => {
            it('"Fn::Base64" with nested "Ref"', () => {
                const result = referencedLogicalIds('{"Fn::Base64": {"Ref": "MyParam"}}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::Cidr
        describe('Fn::Cidr', () => {
            it('"Fn::Cidr" with nested "Fn::GetAtt"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Cidr": [{"Fn::GetAtt": ["MyVpc", "CidrBlock"]}, 6, 8]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyVpc']));
            });
        });

        // Fn::GetAZs
        describe('Fn::GetAZs', () => {
            it('"Fn::GetAZs" with "Ref"', () => {
                const result = referencedLogicalIds('{"Fn::GetAZs": {"Ref": "MyRegion"}}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyRegion']));
            });
        });

        // Fn::ImportValue
        describe('Fn::ImportValue', () => {
            it('"Fn::ImportValue" with "Fn::Sub"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::ImportValue": {"Fn::Sub": "${MyStack}-VpcId"}}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyStack']));
            });
        });

        // Fn::Join
        describe('Fn::Join', () => {
            it('"Fn::Join" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Join": ["-", [{"Ref": "Prefix"}, {"Ref": "Suffix"}]]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['Prefix', 'Suffix']));
            });
        });

        // Fn::Length
        describe('Fn::Length', () => {
            it('"Fn::Length" with "Ref"', () => {
                const result = referencedLogicalIds('{"Fn::Length": {"Ref": "MyList"}}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyList']));
            });
        });

        // Fn::Select
        describe('Fn::Select', () => {
            it('"Fn::Select" with "Ref"', () => {
                const result = referencedLogicalIds('{"Fn::Select": [0, {"Ref": "MyList"}]}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyList']));
            });
        });

        // Fn::Split
        describe('Fn::Split', () => {
            it('"Fn::Split" with "Ref"', () => {
                const result = referencedLogicalIds('{"Fn::Split": [",", {"Ref": "MyString"}]}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyString']));
            });
        });

        // Fn::ToJsonString
        describe('Fn::ToJsonString', () => {
            it('"Fn::ToJsonString" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::ToJsonString": {"Key": {"Ref": "MyValue"}}}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyValue']));
            });
        });

        // Fn::Transform
        describe('Fn::Transform', () => {
            it('"Fn::Transform" with nested "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Transform": {"Name": "Macro", "Parameters": {"P": {"Ref": "MyParam"}}}}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::And
        describe('Fn::And', () => {
            it('"Fn::And" with "Condition"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::And": [{"Condition": "Cond1"}, {"Condition": "Cond2"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Fn::Equals
        describe('Fn::Equals', () => {
            it('"Fn::Equals" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Equals": [{"Ref": "MyParam"}, "value"]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyParam']));
            });
        });

        // Fn::Not
        describe('Fn::Not', () => {
            it('"Fn::Not" with "Condition"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Not": [{"Condition": "MyCondition"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        // Fn::Or
        describe('Fn::Or', () => {
            it('"Fn::Or" with "Condition"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Or": [{"Condition": "Cond1"}, {"Condition": "Cond2"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Fn::ForEach
        describe('Fn::ForEach', () => {
            it('"Fn::ForEach" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::ForEach::Loop": ["Id", ["A"], {"${Id}": {"Ref": "MyRef"}}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['Id', 'MyRef']));
            });
        });

        // Rules intrinsics
        describe('Rules intrinsics', () => {
            it('"Fn::Contains" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Contains": [["a", "b"], {"Ref": "MyParam"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyParam']));
            });

            it('"Fn::EachMemberEquals" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::EachMemberEquals": [{"Ref": "MyList"}, "value"]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyList']));
            });

            it('"Fn::EachMemberIn" with "Ref"', () => {
                const result = referencedLogicalIds(
                    '{"Fn::EachMemberIn": [{"Ref": "MyList"}, ["a", "b"]]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['MyList']));
            });

            it('"Fn::RefAll" with nested "Fn::If"', () => {
                // Fn::RefAll takes a parameter type, but can be nested in conditions
                const result = referencedLogicalIds(
                    '{"Fn::If": ["UseVpc", {"Fn::RefAll": "AWS::EC2::VPC::Id"}, {"Ref": "DefaultVpc"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['UseVpc', 'DefaultVpc']));
            });

            it('"Fn::ValueOf"', () => {
                const result = referencedLogicalIds('{"Fn::ValueOf": ["MyParam", "Attr"]}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyParam']));
            });

            it('"Fn::ValueOfAll" with nested "Fn::If"', () => {
                // Fn::ValueOfAll takes a parameter type, but can be nested in conditions
                const result = referencedLogicalIds(
                    '{"Fn::If": ["UseTags", {"Fn::ValueOfAll": ["AWS::EC2::VPC::Id", "Tags"]}, {"Ref": "DefaultTags"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['UseTags', 'DefaultTags']));
            });

            it('"Fn::Implies" with nested conditions', () => {
                const result = referencedLogicalIds(
                    '{"Fn::Implies": [{"Condition": "Cond1"}, {"Condition": "Cond2"}]}',
                    '',
                    DocumentType.JSON,
                );
                expect(result).toEqual(new Set(['Cond1', 'Cond2']));
            });
        });

        // Multi-line JSON templates
        describe('Multi-line templates', () => {
            it('resource with nested properties', () => {
                const text = `{
  "MyBucket": {
    "Type": "AWS::S3::Bucket",
    "Condition": "IsProduction",
    "DependsOn": ["MyRole", "MyPolicy"],
    "Properties": {
      "BucketName": {"Fn::Sub": "\${Environment}-bucket"},
      "Tags": [
        {"Key": "Environment", "Value": {"Ref": "Environment"}},
        {"Key": "Owner", "Value": {"Ref": "Owner"}}
      ]
    }
  }
}`;
                const result = referencedLogicalIds(text, '', DocumentType.JSON);
                expect(result).toEqual(new Set(['IsProduction', 'MyRole', 'MyPolicy', 'Environment', 'Owner']));
            });

            it('conditions block', () => {
                const text = `{
  "Conditions": {
    "IsProduction": {"Fn::Equals": [{"Ref": "Environment"}, "production"]},
    "IsNotDev": {"Fn::Not": [{"Condition": "IsDevelopment"}]},
    "IsUsEast": {
      "Fn::And": [
        {"Condition": "IsProduction"},
        {"Fn::Equals": [{"Ref": "Region"}, "us-east-1"]}
      ]
    },
    "HasFeature": {
      "Fn::Or": [
        {"Condition": "IsProduction"},
        {"Fn::Equals": [{"Ref": "EnableFeature"}, "true"]}
      ]
    }
  }
}`;
                const result = referencedLogicalIds(text, '', DocumentType.JSON);
                expect(result).toEqual(
                    new Set(['Environment', 'IsDevelopment', 'IsProduction', 'Region', 'EnableFeature']),
                );
            });

            it('outputs block', () => {
                const text = `{
  "Outputs": {
    "VpcId": {
      "Value": {"Ref": "MyVpc"},
      "Export": {"Name": {"Fn::Sub": "\${StackName}-VpcId"}}
    },
    "SubnetId": {
      "Value": {"Fn::GetAtt": ["MySubnet", "SubnetId"]},
      "Condition": "HasSubnet"
    }
  }
}`;
                const result = referencedLogicalIds(text, '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyVpc', 'StackName', 'MySubnet', 'HasSubnet']));
            });

            it('Fn::Sub with mapping', () => {
                const text = `{
  "Fn::Sub": [
    "arn:aws:s3:::\${BucketName}/*",
    {
      "BucketName": {"Ref": "MyBucket"}
    }
  ]
}`;
                const result = referencedLogicalIds(text, '', DocumentType.JSON);
                expect(result).toEqual(new Set(['BucketName', 'MyBucket']));
            });

            it('nested Fn::If', () => {
                const text = `{
  "Value": {
    "Fn::If": [
      "IsProduction",
      {"Fn::If": ["HasBackup", {"Ref": "ProdBackupBucket"}, {"Ref": "ProdBucket"}]},
      {"Ref": "DevBucket"}
    ]
  }
}`;
                const result = referencedLogicalIds(text, '', DocumentType.JSON);
                expect(result).toEqual(
                    new Set(['IsProduction', 'HasBackup', 'ProdBackupBucket', 'ProdBucket', 'DevBucket']),
                );
            });
        });
    });

    describe('Quoted YAML keys', () => {
        it('single-quoted Ref', () => {
            const result = referencedLogicalIds("'Ref': MyResource", '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyResource']));
        });

        it('double-quoted Ref', () => {
            const result = referencedLogicalIds('"Ref": MyResource', '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyResource']));
        });

        it('single-quoted Condition', () => {
            const result = referencedLogicalIds("'Condition': MyCondition", '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyCondition']));
        });

        it('double-quoted Fn::If', () => {
            const result = referencedLogicalIds('"Fn::If": [MyCondition, yes, no]', '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyCondition']));
        });

        it('single-quoted Fn::GetAtt', () => {
            const result = referencedLogicalIds("'Fn::GetAtt': [MyResource, Arn]", '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyResource']));
        });

        it('double-quoted DependsOn', () => {
            const result = referencedLogicalIds('"DependsOn": MyResource', '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyResource']));
        });
    });

    describe('Whitespace handling', () => {
        describe('YAML', () => {
            it('space before colon', () => {
                const result = referencedLogicalIds('Ref : MyResource', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('multiple spaces around colon', () => {
                const result = referencedLogicalIds('Condition  :  MyCondition', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });

            it('no space after colon', () => {
                const result = referencedLogicalIds('Ref:MyResource', '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        describe('JSON', () => {
            it('space before colon', () => {
                const result = referencedLogicalIds('{"Ref" : "MyResource"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('multiple spaces around colon', () => {
                const result = referencedLogicalIds('{"Ref"  :  "MyResource"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('no space after colon', () => {
                const result = referencedLogicalIds('{"Ref":"MyResource"}', '', DocumentType.JSON);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });
    });
});
