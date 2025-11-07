import { TopLevelSection } from '../context/ContextType';
import { CloudFormationFileType, DocumentType } from './Document';

const TemplateKeys = [
    TopLevelSection.AWSTemplateFormatVersion.toString(),
    TopLevelSection.Resources.toString(),
    TopLevelSection.Transform.toString(),
];

export function isCloudFormationTemplate(content: string, documentType: DocumentType): boolean {
    // Require at least one definitive CloudFormation key (AWSTemplateFormatVersion, Resources, or Transform)
    return hasSufficientKeys(content, TemplateKeys, 1, documentType, TemplateKeys);
}

const GitSyncKeys = ['template-file-path', 'templateFilePath', 'templatePath'];

export function isGitSyncDeploymentFile(content: string, documentType: DocumentType): boolean {
    return hasSufficientKeys(content, GitSyncKeys, 1, documentType);
}

export function detectCfnFileType(content: string, documentType: DocumentType): CloudFormationFileType {
    if (isGitSyncDeploymentFile(content, documentType)) {
        return CloudFormationFileType.GitSyncDeployment;
    } else if (isCloudFormationTemplate(content, documentType)) {
        return CloudFormationFileType.Template;
    } else {
        return CloudFormationFileType.Unknown;
    }
}

function hasSufficientKeys(
    content: string,
    keys: readonly string[],
    requiredMatches: number,
    documentType: DocumentType,
    specialKeys?: readonly string[],
): boolean {
    let matchCount = 0;

    for (const key of keys) {
        const keyPattern =
            documentType === DocumentType.JSON
                ? new RegExp(`^\\s*({)?\\s*"${key}"\\s*:.*`, 'm') // eslint-disable-line security/detect-non-literal-regexp
                : new RegExp(`^\\s*${key}\\s*:.*`, 'm'); // eslint-disable-line security/detect-non-literal-regexp

        if (keyPattern.test(content)) {
            matchCount++;

            if (specialKeys?.includes(key) || matchCount >= requiredMatches) {
                return true;
            }
        }
    }

    return false;
}
