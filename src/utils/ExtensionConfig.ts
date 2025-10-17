import Pkg from '../../package.json';

export const ExtensionId = `${Pkg.publisher.toLowerCase()}-cfn-lsp`;
export const ExtensionName = Pkg.displayName;
export const ExtensionVersion = Pkg.version;
