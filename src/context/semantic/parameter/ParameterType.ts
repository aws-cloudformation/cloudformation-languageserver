import { isStringABoolean, stringToBoolean } from '../../../utils/String';
import { toNumber, toNumberList } from '../../../utils/TypeConverters';

/**
 * CloudFormation parameter types
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html#parameters-section-structure-properties-type
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
 */
export enum ParameterType {
    String = 'String',
    Number = 'Number',
    CommaDelimitedList = 'CommaDelimitedList',
    List_Number = 'List<Number>',
    List_String = 'List<String>',
    List_AWS_EC2_AvailabilityZone_Name = 'List<AWS::EC2::AvailabilityZone::Name>',
    List_AWS_EC2_Image_Id = 'List<AWS::EC2::Image::Id>',
    List_AWS_EC2_Instance_Id = 'List<AWS::EC2::Instance::Id>',
    List_AWS_EC2_SecurityGroup_GroupName = 'List<AWS::EC2::SecurityGroup::GroupName>',
    List_AWS_EC2_SecurityGroup_Id = 'List<AWS::EC2::SecurityGroup::Id>',
    List_AWS_EC2_Subnet_Id = 'List<AWS::EC2::Subnet::Id>',
    List_AWS_EC2_VPC_Id = 'List<AWS::EC2::VPC::Id>',
    List_AWS_EC2_Volume_Id = 'List<AWS::EC2::Volume::Id>',
    List_AWS_Route53_HostedZone_Id = 'List<AWS::Route53::HostedZone::Id>',
    AWS_EC2_AvailabilityZone_Name = 'AWS::EC2::AvailabilityZone::Name',
    AWS_EC2_Image_Id = 'AWS::EC2::Image::Id',
    AWS_EC2_Instance_Id = 'AWS::EC2::Instance::Id',
    AWS_EC2_KeyPair_KeyName = 'AWS::EC2::KeyPair::KeyName',
    AWS_EC2_SecurityGroup_GroupName = 'AWS::EC2::SecurityGroup::GroupName',
    AWS_EC2_SecurityGroup_Id = 'AWS::EC2::SecurityGroup::Id',
    AWS_EC2_Subnet_Id = 'AWS::EC2::Subnet::Id',
    AWS_EC2_VPC_Id = 'AWS::EC2::VPC::Id',
    AWS_EC2_Volume_Id = 'AWS::EC2::Volume::Id',
    AWS_Route53_HostedZone_Id = 'AWS::Route53::HostedZone::Id',
    AWS_SSM_Parameter_Name = 'AWS::SSM::Parameter::Name',
    AWS_SSM_Parameter_Value_AWS_EC2_AvailabilityZone_Name = 'AWS::SSM::Parameter::Value<AWS::EC2::AvailabilityZone::Name>',
    AWS_SSM_Parameter_Value_AWS_EC2_Image_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
    AWS_SSM_Parameter_Value_AWS_EC2_Instance_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::Instance::Id>',
    AWS_SSM_Parameter_Value_AWS_EC2_KeyPair_KeyName = 'AWS::SSM::Parameter::Value<AWS::EC2::KeyPair::KeyName>',
    AWS_SSM_Parameter_Value_AWS_EC2_SecurityGroup_GroupName = 'AWS::SSM::Parameter::Value<AWS::EC2::SecurityGroup::GroupName>',
    AWS_SSM_Parameter_Value_AWS_EC2_SecurityGroup_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::SecurityGroup::Id>',
    AWS_SSM_Parameter_Value_AWS_EC2_Subnet_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::Subnet::Id>',
    AWS_SSM_Parameter_Value_AWS_EC2_VPC_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>',
    AWS_SSM_Parameter_Value_AWS_EC2_Volume_Id = 'AWS::SSM::Parameter::Value<AWS::EC2::Volume::Id>',
    AWS_SSM_Parameter_Value_AWS_Route53_HostedZone_Id = 'AWS::SSM::Parameter::Value<AWS::Route53::HostedZone::Id>',
    AWS_SSM_Parameter_Value_AWS_SSM_Parameter_Name = 'AWS::SSM::Parameter::Value<AWS::SSM::Parameter::Name>',
    AWS_SSM_Parameter_Value_Number = 'AWS::SSM::Parameter::Value<Number>',
    AWS_SSM_Parameter_Value_String = 'AWS::SSM::Parameter::Value<String>',
    AWS_SSM_Parameter_Value_CommaDelimitedList = 'AWS::SSM::Parameter::Value<CommaDelimitedList>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_AvailabilityZone_Name = 'AWS::SSM::Parameter::Value<List<AWS::EC2::AvailabilityZone::Name>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_Image_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::Image::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_Instance_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::Instance::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_SecurityGroup_GroupName = 'AWS::SSM::Parameter::Value<List<AWS::EC2::SecurityGroup::GroupName>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_SecurityGroup_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::SecurityGroup::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_Subnet_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_VPC_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::VPC::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_EC2_Volume_Id = 'AWS::SSM::Parameter::Value<List<AWS::EC2::Volume::Id>>',
    AWS_SSM_Parameter_Value_List_AWS_Route53_HostedZone_Id = 'AWS::SSM::Parameter::Value<List<AWS::Route53::HostedZone::Id>>',
    AWS_SSM_Parameter_Value_List_Number = 'AWS::SSM::Parameter::Value<List<Number>>',
    AWS_SSM_Parameter_Value_List_String = 'AWS::SSM::Parameter::Value<List<String>>',
}

export const PARAMETER_TYPES = Object.values(ParameterType);

function isNumericType(type?: ParameterType): boolean {
    if (!type) {
        return false;
    }
    return type.includes('Number');
}

export type ParameterValueType = string | number | boolean;

export function coerceParameterToTypedValues(
    object: Record<string, string | number | boolean | ParameterType | undefined | unknown[]>,
) {
    const Type = object['Type'] as ParameterType | undefined;
    const Default = object['Default'] as string | number | undefined;
    const AllowedValues = object['AllowedValues'] as (string | number)[] | undefined;

    let isBoolean = false;
    if (Default !== undefined) {
        isBoolean = isStringABoolean(String(Default));
    }

    if (AllowedValues !== undefined && AllowedValues.length > 0) {
        isBoolean = AllowedValues.every((x) => isStringABoolean(String(x)));
    }

    if (isBoolean) {
        return {
            Default: Default === undefined ? undefined : stringToBoolean(String(Default)),
            AllowedValues:
                AllowedValues === undefined ? undefined : AllowedValues.map((x) => stringToBoolean(String(x))),
        };
    }

    if (isNumericType(Type)) {
        return {
            Default: Default === undefined ? undefined : toNumber(Default),
            AllowedValues: AllowedValues === undefined ? undefined : toNumberList(AllowedValues),
        };
    }

    return {
        Default,
        AllowedValues,
    };
}
