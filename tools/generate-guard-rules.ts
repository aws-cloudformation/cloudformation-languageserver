#!/usr/bin/env node

/**
 * Guard Rules Generator
 *
 * Downloads AWS Guard Rules Registry and generates a TypeScript file with:
 * - All individual rules parsed from guard-rules-registry-all-rules.guard
 * - Rule pack mappings showing which rules belong to each pack
 *
 * This eliminates the need for runtime file parsing and reduces bundle size
 * by avoiding rule duplication across multiple pack files.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as yauzl from 'yauzl';

// Configuration with environment variable support
const DEFAULT_VERSION = '1.0.2';
const DEFAULT_BASE_URL = 'https://github.com/aws-cloudformation/aws-guard-rules-registry/releases/download';

const VERSION = process.env.GUARD_RULES_VERSION ?? DEFAULT_VERSION;
const BASE_URL = process.env.GUARD_RULES_BASE_URL ?? DEFAULT_BASE_URL;
const RULES_ZIP_URL = `${BASE_URL}/${VERSION}/ruleset-build-v${VERSION}.zip`;

const TEMP_DIR = path.join(__dirname, '.temp');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'services', 'guard', 'GeneratedGuardRules.ts');

interface ParsedGuardRule {
    name: string;
    content: string;
    description: string;
    message?: string;
}

interface RulePack {
    name: string;
    rules: string[];
}

/**
 * Download file using axios
 */
async function downloadFile(url: string, outputPath: string): Promise<void> {
    const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
    });
}

/**
 * Extract zip file using yauzl library for better cross-platform compatibility
 */
async function extractZip(zipPath: string, extractDir: string): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
        yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
            if (err) {
                reject(new Error(`Failed to open zip file: ${err.message}`));
                return;
            }

            if (!zipfile) {
                reject(new Error('Failed to open zip file: zipfile is null'));
                return;
            }

            let extractedCount = 0;
            let totalEntries = 0;

            // Count total entries first
            zipfile.on('entry', () => {
                totalEntries++;
            });

            // Reset and start extraction
            zipfile.readEntry();

            zipfile.on('entry', (entry) => {
                const entryPath = path.join(extractDir, entry.fileName);

                // Ensure the entry path is within the extract directory (security check)
                const normalizedPath = path.normalize(entryPath);
                if (!normalizedPath.startsWith(path.normalize(extractDir))) {
                    reject(new Error(`Zip entry path is outside extract directory: ${entry.fileName}`));
                    return;
                }

                if (/\/$/.test(entry.fileName)) {
                    // Directory entry
                    fs.mkdirSync(entryPath, { recursive: true });
                    extractedCount++;

                    if (extractedCount % 10 === 0) {
                        process.stdout.write(`\r   📦 Extracting: ${extractedCount}/${totalEntries} files`);
                    }

                    zipfile.readEntry();
                } else {
                    // File entry
                    zipfile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            reject(new Error(`Failed to read zip entry ${entry.fileName}: ${err.message}`));
                            return;
                        }

                        if (!readStream) {
                            reject(new Error(`Failed to read zip entry ${entry.fileName}: readStream is null`));
                            return;
                        }

                        // Ensure directory exists
                        fs.mkdirSync(path.dirname(entryPath), { recursive: true });

                        const writeStream = fs.createWriteStream(entryPath);
                        readStream.pipe(writeStream);

                        writeStream.on('close', () => {
                            extractedCount++;

                            if (extractedCount % 10 === 0) {
                                process.stdout.write(`\r   📦 Extracting: ${extractedCount}/${totalEntries} files`);
                            }

                            zipfile.readEntry();
                        });

                        writeStream.on('error', (err) => {
                            reject(new Error(`Failed to write file ${entryPath}: ${err.message}`));
                        });

                        readStream.on('error', (err) => {
                            reject(new Error(`Failed to read zip entry ${entry.fileName}: ${err.message}`));
                        });
                    });
                }
            });

            zipfile.on('end', () => {
                console.log(`\n   ✅ Extracted ${extractedCount} files`);
                resolve();
            });

            zipfile.on('error', (err) => {
                reject(new Error(`Zip extraction error: ${err.message}`));
            });
        });
    });
}

/**
 * Clean custom messages in Guard rule content by removing Guard Rule Set and Controls lines
 */
function cleanCustomMessages(content: string): string {
    // Split content into lines and process each line
    const lines = content.split('\n');
    const cleanedLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();

        // Skip lines that contain Guard Rule Set or Controls metadata
        if (trimmed.startsWith('Guard Rule Set:') || trimmed.startsWith('Controls:')) {
            continue;
        }

        // Keep all other lines
        cleanedLines.push(line);
    }

    return cleanedLines.join('\n');
}

/**
 * Extract violation message from Guard rule content << >> blocks
 */
function extractViolationMessage(content: string): string | undefined {
    const messageMatch = content.match(/<<\s*([\s\S]*?)\s*>>/);
    if (!messageMatch) return undefined;

    const messageBlock = messageMatch[1];
    const fixMatch = messageBlock.match(/Fix:\s*([^\n]+)/);

    if (fixMatch) {
        return `${fixMatch[1].trim()}\n`;
    }

    return undefined;
}

/**
 * Parse guard rules file and extract individual rules
 */
function parseGuardRulesFile(content: string): ParsedGuardRule[] {
    const rules: ParsedGuardRule[] = [];

    // Split by both rule identifier formats
    // 1. "# Rule Identifier:" format
    // 2. "## Config Rule Name :" format
    const ruleBlocks = content
        .split(/(?=^(?:#\s*Rule Identifier:\s*$|##\s*Config Rule Name\s*:))/m)
        .filter((block) => block.trim());

    for (const block of ruleBlocks) {
        const lines = block.split('\n');

        // Find the rule name using either format
        let name: string | undefined;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();

            // Format 1: # Rule Identifier: (name on next line)
            if (trimmed === '# Rule Identifier:') {
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1].trim();
                    if (nextLine.startsWith('#')) {
                        name = nextLine.replace(/^#\s*/, '').trim();
                    }
                }
                break;
            }

            // Format 2: ## Config Rule Name : rule-name (name on same line)
            if (trimmed.startsWith('## Config Rule Name :')) {
                const configRuleName = trimmed.replace(/^##\s*Config Rule Name\s*:\s*/, '').trim();
                // Convert kebab-case to UPPER_SNAKE_CASE to match actual rule names
                name = configRuleName.toUpperCase().replace(/-/g, '_');
                break;
            }
        }

        if (!name) continue;

        const guardContent: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip all comment lines (lines starting with #)
            if (trimmed.startsWith('#')) {
                continue;
            }

            // Include ALL non-comment lines exactly as they are
            guardContent.push(line);
        }

        let cleanContent = guardContent.join('\n').trim();

        // Skip if no actual Guard content found
        if (!cleanContent?.includes('rule ')) {
            continue;
        }

        // Clean up custom messages by removing Guard Rule Set and Controls lines
        cleanContent = cleanCustomMessages(cleanContent);

        // Extract violation message from << >> blocks
        const message = extractViolationMessage(cleanContent);

        // Remove << >> blocks from content after extracting message
        const contentWithoutMessages = cleanContent.replace(/<<\s*[\s\S]*?\s*>>/g, '').trim();

        rules.push({
            name,
            content: contentWithoutMessages,
            description: `Guard rule: ${name}`,
            message,
        });
    }

    return rules;
}

/**
 * Parse individual rule pack file to extract rule names
 */
function parseRulePackFile(content: string, packName: string): RulePack {
    const rules: string[] = [];

    // Similar parsing but just extract rule names
    const ruleBlocks = content.split(/(?=^rule\s+)/m).filter((block) => block.trim());

    for (const block of ruleBlocks) {
        const firstLine = block.split('\n')[0]?.trim();
        if (!firstLine?.startsWith('rule ')) continue;

        const nameMatch = firstLine.match(/^rule\s+([A-Z_][A-Z0-9_]*)/);
        if (nameMatch) {
            rules.push(nameMatch[1]);
        }
    }

    return { name: packName, rules };
}

/**
 * Generate TypeScript file with all rules and pack mappings
 */
function generateTypeScriptFile(
    allRules: ParsedGuardRule[],
    rulePacks: RulePack[],
    version: string,
    sourceUrl: string,
): string {
    const rulesObject = allRules
        .map((rule) => {
            // Use template literals for better readability - escape backticks, ${}, and backslashes in content
            const contentEscaped = rule.content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
            const descriptionEscaped = rule.description.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const messageEscaped = rule.message
                ? rule.message.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
                : undefined;

            return `    ${rule.name}: {
        name: '${rule.name}',
        content: \`${contentEscaped}\`,
        description: '${descriptionEscaped}',${messageEscaped ? `\n        message: '${messageEscaped}',` : ''}
    }`;
        })
        .join(',\n');

    const packsObject = rulePacks
        .map((pack) => {
            // Format rule arrays with proper line breaks and indentation
            const rulesFormatted = pack.rules.map((rule) => `'${rule}',`).join('\n        ');
            return `    '${pack.name}': [
        ${rulesFormatted}
    ]`;
        })
        .join(',\n');

    const generationDate = new Date().toISOString();

    return `/* eslint-disable prettier/prettier */
/**
 * Generated Guard Rules Data
 *
 * This file is auto-generated by tools/generate-guard-rules.ts
 * Do not edit manually - run the generator script to update.
 *
 * Contains all AWS Guard rules and rule pack mappings to eliminate
 * runtime file parsing and reduce bundle size.
 *
 * Source: AWS Guard Rules Registry v${VERSION}
 * Generated: ${generationDate}
 * URL: ${RULES_ZIP_URL}
 */

export interface GuardRuleData {
    name: string;
    content: string;
    description: string;
    message?: string;
}

export const ALL_RULES: Record<string, GuardRuleData> = {
${rulesObject}
};

export const RULE_PACKS: Record<string, string[]> = {
${packsObject}
};

export function getRulesForPack(packName: string): GuardRuleData[] {
    const ruleNames = RULE_PACKS[packName];
    if (!ruleNames) {
        throw new Error('Unknown rule pack: ' + packName);
    }
    
    return ruleNames.map(name => {
        const rule = ALL_RULES[name];
        if (!rule) {
            throw new Error('Rule not found: ' + name);
        }
        return rule;
    });
}

export function getAvailableRulePacks(): string[] {
    return Object.keys(RULE_PACKS);
}
`;
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting Guard Rules generation...');
    console.log(`📋 Configuration:`);
    console.log(`   Version: ${VERSION}`);
    console.log(`   URL: ${RULES_ZIP_URL}`);

    if (process.env.GUARD_RULES_VERSION) {
        console.log(`   ℹ️  Using custom version from GUARD_RULES_VERSION environment variable`);
    }
    if (process.env.GUARD_RULES_BASE_URL) {
        console.log(`   ℹ️  Using custom base URL from GUARD_RULES_BASE_URL environment variable`);
    }

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const zipPath = path.join(TEMP_DIR, 'rules.zip');
    const extractDir = path.join(TEMP_DIR, 'extracted');

    try {
        // Download zip file
        console.log('📥 Downloading rules zip...');
        await downloadFile(RULES_ZIP_URL, zipPath);

        console.log('📦 Extracting zip file...');
        if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });
        await extractZip(zipPath, extractDir);

        // Find and parse rule pack files (excluding all-rules file)
        console.log('📋 Parsing rule packs...');
        const outputDir = path.join(extractDir, 'output');
        const files = fs.readdirSync(outputDir);

        const allRulesMap = new Map<string, ParsedGuardRule>();
        const rulePacks: RulePack[] = [];

        for (const file of files) {
            if (file.endsWith('.guard') && file !== 'guard-rules-registry-all-rules.guard') {
                const packName = file.replace('.guard', '');
                const packPath = path.join(outputDir, file);
                const packContent = fs.readFileSync(packPath, 'utf8');

                // Parse rules from this pack file
                const packRules = parseGuardRulesFile(packContent);
                const ruleNames: string[] = [];

                for (const rule of packRules) {
                    ruleNames.push(rule.name);

                    // Add to global rules map if not already present
                    // This ensures we get the rule with the correct Guard Rule Set information
                    if (!allRulesMap.has(rule.name)) {
                        allRulesMap.set(rule.name, rule);
                    }
                }

                if (ruleNames.length > 0) {
                    // Sort rule names within each pack for consistency
                    ruleNames.sort();
                    rulePacks.push({ name: packName, rules: ruleNames });
                    console.log(`  - ${packName}: ${ruleNames.length} rules`);
                }
            }
        }

        // Convert map to array and sort by rule name for consistent ordering
        const allRules = [...allRulesMap.values()].sort((a, b) => a.name.localeCompare(b.name));
        console.log(`🔍 Found ${allRules.length} unique rules across all packs`);

        // Sort rule packs by name for consistent ordering
        rulePacks.sort((a, b) => a.name.localeCompare(b.name));

        // Generate TypeScript file
        console.log('⚡ Generating TypeScript file...');
        const tsContent = generateTypeScriptFile(allRules, rulePacks, VERSION, RULES_ZIP_URL);

        // Ensure output directory exists
        const outputFileDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputFileDir)) {
            fs.mkdirSync(outputFileDir, { recursive: true });
        }

        // Write output file
        fs.writeFileSync(OUTPUT_FILE, tsContent, 'utf8');

        console.log(`✅ Generated ${OUTPUT_FILE}`);
        console.log(`📊 Summary: ${allRules.length} rules, ${rulePacks.length} packs`);
    } catch (error) {
        console.error('❌ Error generating guard rules:', error);
        process.exit(1);
    } finally {
        // Cleanup temp directory
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true });
        }
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
