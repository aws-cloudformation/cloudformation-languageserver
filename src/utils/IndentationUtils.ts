import { DocumentType } from '../document/Document';
import { EditorSettings } from '../settings/Settings';

/**
 * Get the appropriate indentation string based on user settings and document type
 * @param editorSettings Editor settings for accessing configuration
 * @param documentType Document type (YAML or JSON) to determine indentation behavior
 */
export function getIndentationString(editorSettings: EditorSettings, documentType: DocumentType): string {
    const tabSize = editorSettings.tabSize;

    if (documentType === DocumentType.YAML) {
        return ' '.repeat(tabSize);
    } else {
        return editorSettings.insertSpaces ? ' '.repeat(tabSize) : '\t';
    }
}

/**
 * Apply indentation to a multi-line snippet template
 * @param template The snippet template with placeholder indentation markers
 * @param editorSettings Editor settings for indentation (can be document-specific)
 * @param documentType Document type (YAML/JSON)
 * @returns Formatted snippet with proper indentation
 */
export function applySnippetIndentation(
    template: string,
    editorSettings: EditorSettings,
    documentType: DocumentType,
): string {
    const baseIndent = getIndentationString(editorSettings, documentType);

    return template
        .replaceAll(/\n\s*{INDENT1}/g, `\n${baseIndent}`)
        .replaceAll(/\n\s*{INDENT2}/g, `\n${baseIndent.repeat(2)}`)
        .replaceAll(/\n\s*{INDENT3}/g, `\n${baseIndent.repeat(3)}`);
}
