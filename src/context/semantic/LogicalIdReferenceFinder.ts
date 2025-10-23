import { SyntaxNode } from 'tree-sitter';
import { DocumentType } from '../../document/Document';
import { PseudoParametersSet } from '../ContextType';

export function selectText(specificNode: SyntaxNode, fullEntitySearch: boolean, rootNode?: SyntaxNode): string {
    let text: string | undefined;
    if (fullEntitySearch) {
        text = rootNode?.text;
    }

    return text ?? specificNode.text ?? '';
}

export function referencedLogicalIds(
    textToSearch: string,
    currentLogicalId: string,
    documentType: DocumentType,
): Set<string> {
    const text = textToSearch.trim();
    if (!text) {
        return new Set();
    }

    const logicalIds = new Set<string>();

    if (documentType === DocumentType.YAML) {
        findYamlIntrinsicReferences(text, logicalIds);
    } else {
        findJsonIntrinsicReferences(text, logicalIds);
    }

    // Remove current logical ID
    logicalIds.delete(currentLogicalId);
    return logicalIds;
}

function findJsonIntrinsicReferences(text: string, logicalIds: Set<string>): void {
    // Single pass through text with combined regex for better performance
    const refIndex = text.indexOf('"Ref"');
    const getAttIndex = text.indexOf('"Fn::GetAtt"');
    const findMapIndex = text.indexOf('"Fn::FindInMap"');
    const subIndex = text.indexOf('"Fn::Sub"');
    const ifIndex = text.indexOf('"Fn::If"');
    const conditionIndex = text.indexOf('"Condition"');
    const dependsIndex = text.indexOf('"DependsOn"');
    const subVarIndex = text.indexOf('${');

    if (refIndex !== -1) {
        extractMatches(text, JsonRef, logicalIds);
    }
    if (getAttIndex !== -1) {
        extractMatches(text, JsonGetAtt, logicalIds);
    }
    if (findMapIndex !== -1) {
        extractMatches(text, JsonFindInMap, logicalIds);
    }
    if (subIndex !== -1) {
        let subMatch: RegExpExecArray | null;
        while ((subMatch = JsonSub.exec(text)) !== null) {
            const templateString = subMatch[1];
            extractMatches(templateString, JsonSubVariables, logicalIds);
        }
    }
    if (ifIndex !== -1) {
        extractMatches(text, JsonIf, logicalIds);
    }
    if (conditionIndex !== -1) {
        extractMatches(text, JsonCondition, logicalIds);
    }
    if (subVarIndex !== -1) {
        extractMatches(text, JsonSubVariables, logicalIds);
    }
    if (dependsIndex !== -1) {
        extractJsonDependsOnReferences(text, logicalIds);
    }
}

function findYamlIntrinsicReferences(text: string, logicalIds: Set<string>): void {
    if (text.includes('!Ref')) {
        extractMatches(text, YamlRef, logicalIds);
    }
    if (text.includes('!GetAtt')) {
        extractMatches(text, YamlGetAtt, logicalIds);
        extractMatches(text, YamlGetAttArray, logicalIds);
    }
    if (text.includes('!FindInMap')) {
        extractMatches(text, YamlFindInMap, logicalIds);
    }

    // Extract template strings from !Sub and find variables within them
    if (text.includes('!Sub')) {
        let subMatch: RegExpExecArray | null;
        while ((subMatch = YamlSub.exec(text)) !== null) {
            const templateString = subMatch[1];
            extractMatches(templateString, YamlSubVariables, logicalIds);
        }
    }
    if (text.includes('Ref:')) {
        extractMatches(text, YamlRefColon, logicalIds);
    }
    if (text.includes('Fn::GetAtt:')) {
        extractMatches(text, YamlGetAttColon, logicalIds);
    }
    if (text.includes('Fn::FindInMap:')) {
        extractMatches(text, YamlFindInMapColon, logicalIds);
    }

    // Extract template strings from Fn::Sub and find variables within them
    if (text.includes('Fn::Sub:')) {
        let subMatch: RegExpExecArray | null;
        while ((subMatch = YamlSubColon.exec(text)) !== null) {
            const templateString = subMatch[1];
            extractMatches(templateString, YamlSubVariables, logicalIds);
        }
    }
    if (text.includes('Condition:')) {
        extractMatches(text, YamlCondition, logicalIds);
    }
    if (text.includes('${')) {
        extractMatches(text, YamlSubVariables, logicalIds);
    }
    if (text.includes('- ')) {
        extractMatches(text, YamlInlineListItem, logicalIds);
    }

    if (text.includes('DependsOn:')) {
        extractYamlDependsOnReferences(text, logicalIds);
    }
}

function isValidLogicalId(id: string): boolean {
    // Exclude common property names that aren't logical IDs
    return Boolean(id) && !CommonProperties.has(id) && ValidLogicalId.test(id);
}

function extractMatches(text: string, regex: RegExp, logicalIds: Set<string>): void {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (isValidLogicalId(match[1])) {
            logicalIds.add(match[1].split('.')[0].trim());
        }
    }
}

function extractJsonDependsOnReferences(text: string, logicalIds: Set<string>): void {
    // Handle single dependency
    extractMatches(text, JsonSingleDep, logicalIds);

    // Handle list format
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = JsonArrayDep.exec(text)) !== null) {
        extractMatches(arrayMatch[1], JsonArrayItem, logicalIds);
    }
}

function extractYamlDependsOnReferences(text: string, logicalIds: Set<string>): void {
    // Handle single dependency
    extractMatches(text, YamlSingleDep, logicalIds);

    // Handle list format
    let listMatch: RegExpExecArray | null;
    while ((listMatch = YamlListDep.exec(text)) !== null) {
        extractMatches(listMatch[1], YamlListItem, logicalIds);
    }

    // Handle inline array format
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = YamlInlineDeps.exec(text)) !== null) {
        extractMatches(inlineMatch[1], YamlInlineItemPattern, logicalIds);
    }
}

const CommonProperties = new Set(
    [
        'Type',
        'Properties',
        'DependsOn',
        'Condition',
        'Metadata',
        'CreationPolicy',
        'DeletionPolicy',
        'UpdatePolicy',
        'UpdateReplacePolicy',
        'Description',
        'Value',
        'Export',
        'Name',
        'Status',
        'Effect',
        'Action',
        'Principal',
        'Service',
        'Version',
        'Statement',
        'Resource',
        'Arn',
        'Enabled',
        'Allow',
        'Deny',
        'Key',
        'Value',
        'InstanceType',
        'Ami',
    ].flatMap((word) => [word, word.toUpperCase(), word.toLowerCase()]),
);

// Pre-compiled for performance
const JsonRef = /"Ref"\s*:\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches {"Ref": "LogicalId"} - references to parameters, resources, etc.
const JsonGetAtt = /"Fn::GetAtt"\s*:\s*\[\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches {"Fn::GetAtt": ["LogicalId", "Attribute"]} - gets attributes from resources
const JsonFindInMap = /"Fn::FindInMap"\s*:\s*\[\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches {"Fn::FindInMap": ["MappingName", "Key1", "Key2"]} - lookups in mappings
const JsonSub = /"Fn::Sub"\s*:\s*"([^"]+)"/g; // Matches {"Fn::Sub": "template string"} - string substitution with variables
const JsonIf = /"Fn::If"\s*:\s*\[\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches {"Fn::If": ["ConditionName", "TrueValue", "FalseValue"]} - conditional logic
const JsonCondition = /"Condition"\s*:\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches "Condition": "ConditionName" - resource condition property
const JsonSubVariables = /\$\{([A-Za-z][A-Za-z0-9:]*)\}/g; // Matches ${LogicalId} or ${AWS::Region} - variables in Fn::Sub templates
const JsonSingleDep = /"DependsOn"\s*:\s*"([A-Za-z][A-Za-z0-9]*)"/g; // Matches "DependsOn": "LogicalId" - single resource dependency
const JsonArrayDep = /"DependsOn"\s*:\s*\[([^\]]+)]/g; // Matches "DependsOn": ["Id1", "Id2"] - array of resource dependencies
const JsonArrayItem = /"([A-Za-z][A-Za-z0-9]*)"/g; // Matches "LogicalId" within the DependsOn array

const YamlRef = /!Ref\s+([A-Za-z][A-Za-z0-9]*)/g; // Matches !Ref LogicalId - YAML short form reference
const YamlGetAtt = /!GetAtt\s+([A-Za-z][A-Za-z0-9]*)/g; // Matches !GetAtt LogicalId.Attribute - YAML short form get attribute
const YamlGetAttArray = /!GetAtt\s+\[\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches !GetAtt [LogicalId, Attribute] - YAML short form get attribute with array syntax
const YamlFindInMap = /!FindInMap\s+\[\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches !FindInMap [MappingName, Key1, Key2] - YAML short form mapping lookup
const YamlSub = /!Sub\s+["']?([^"'\n]+)["']?/g; // Matches !Sub "template string" - YAML short form string substitution
const YamlRefColon = /Ref:\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches Ref: LogicalId - YAML long form reference
const YamlGetAttColon = /Fn::GetAtt:\s*\[\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches Fn::GetAtt: [LogicalId, Attribute] - YAML long form get attribute
const YamlFindInMapColon = /Fn::FindInMap:\s*\[\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches Fn::FindInMap: [MappingName, Key1, Key2] - YAML long form mapping lookup
const YamlSubColon = /Fn::Sub:\s*["']?([^"'\n]+)["']?/g; // Matches Fn::Sub: "template string" - YAML long form string substitution
const YamlCondition = /Condition:\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches Condition: ConditionName - resource condition property in YAML
const YamlSubVariables = /\$\{([A-Za-z][A-Za-z0-9:]*)\}/g; // Matches ${LogicalId} or ${AWS::Region} - variables in Fn::Sub templates
const YamlSingleDep = /DependsOn:\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches DependsOn: LogicalId - single resource dependency in YAML
const YamlInlineDeps = /DependsOn:\s*\[([^\]]+)]/g; // Matches DependsOn: [Id1, Id2] - inline array format in YAML
const YamlListItem = /-\s*([A-Za-z][A-Za-z0-9]*)/g; // Matches - LogicalId in YAML list format
const YamlInlineItemPattern = /([A-Za-z][A-Za-z0-9]*)/g; // Matches LogicalId within the inline array

const ValidLogicalId = /^[A-Za-z][A-Za-z0-9.]+$/;

// Validated these regex, they will fail fast with ?= lookahead
const YamlListDep = /DependsOn:\s*\n(\s*-\s*[A-Za-z][A-Za-z0-9]*(?:\s+-\s*[A-Za-z][A-Za-z0-9]*)*)/g; // Matches DependsOn: followed by YAML list items

const YamlInlineListItem = /^(?=\s*-)\s*-\s+([A-Za-z][A-Za-z0-9]*)/gm; // Matches - LogicalId - standalone list items (for DependsOn arrays)

export function isLogicalIdCandidate(str: unknown): boolean {
    if (!str || typeof str !== 'string' || str.length < 2) return false;

    // Skip strings that contain substitution patterns or are single special characters
    if (str.includes('${') || str === '-' || str === '.' || str === '_') return false;

    if (CommonProperties.has(str) || PseudoParametersSet.has(str)) {
        return false;
    }

    // CloudFormation logical IDs should start with a letter, contain only alphanumeric chars, and no spaces
    return ValidLogicalId.test(str);
}
