import { globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPromise from 'eslint-plugin-promise';
import eslintPluginSecurity from 'eslint-plugin-security';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config([
    globalIgnores([
        'build/',
        'bundle/',
        'coverage/',
        'out/',
        'node_modules/',
        'eslint.config.mjs',
        'webpack.*.js',
        'vitest.*.ts',
        '**/*.json',
        '**/*.yaml',
        '**/*.zip',
        '**/.DS_Store',
        '**/.tsbuildinfo',
        '**/*.md',
        'src/services/guard/assets/**',
        'sbom/',
        'vendor/',
    ]),
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginImport.flatConfigs.recommended,
    eslintPluginImport.flatConfigs.typescript,
    eslintPluginPromise.configs['flat/recommended'],
    eslintPluginUnicorn.configs['flat/recommended'],
    eslintPluginSecurity.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // --- General Code Quality & Best Practices ---
            'no-console': 'error',
            'no-debugger': 'error',
            eqeqeq: ['error', 'always'],
            'require-atomic-updates': 'error',

            // --- TypeScript-ESLint Rules (Strict & Quality) ---
            '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
            'no-return-await': 'off',
            '@typescript-eslint/return-await': ['error', 'always'],
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/prefer-readonly': 'error',
            'prefer-const': 'error',

            // --- Import Plugin Rules (Organization & Quality) ---
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin', // Node.js built-in modules (fs, path, etc.)
                        'external', // npm packages
                        'internal', // Internal modules (configured via settings)
                        'parent', // Parent directory imports (../)
                        'sibling', // Same directory imports (./)
                        'index', // Index file imports (./index)
                    ],
                    'newlines-between': 'never',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                },
            ],
            'import/no-self-import': 'error',
            'import/no-useless-path-segments': 'error',
            'import/no-deprecated': 'error',
            'import/first': 'error',
            'import/no-duplicates': ['error', { 'prefer-inline': true }],
            'import/no-namespace': 'error',
            'import/no-named-as-default-member': 'error',

            // --- Code Quality Plugin Overrides ---
            'unicorn/filename-case': 'off',
            'unicorn/prevent-abbreviations': 'off',
            'unicorn/prefer-at': 'off',
            'unicorn/prefer-module': 'off',
            'unicorn/prefer-node-protocol': 'off',
            'unicorn/prefer-ternary': 'off',
            'unicorn/catch-error-name': 'off',
            'unicorn/prefer-string-raw': 'off',
            'unicorn/import-style': [
                'error',
                {
                    styles: {
                        path: {
                            named: true,
                        },
                    },
                },
            ],
            'unicorn/prefer-string-replace-all': 'warn',

            'security/detect-object-injection': 'off',
            'security/detect-non-literal-fs-filename': 'off',

            'promise/always-return': 'off',
            'promise/catch-or-return': 'off',
        },
    },
    {
        files: ['src/**'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'CallExpression[callee.property.name="logRecord"]',
                    message:
                        'Usage of logRecord() function is restricted in src code. This is meant for debugging purposes only',
                },
                {
                    selector: 'MemberExpression[property.name="entityType"]',
                    message:
                        'Usage of entityType property is restricted in src code. This call is an expensive operations, use getEntityType from Context instead',
                },
                {
                    selector:
                        'Literal[value=/^(Resources|Parameters|Outputs|Mappings|Metadata|Rules|Conditions|Transform|AWSTemplateFormatVersion)$/]',
                    message:
                        'Usage of raw TopLevelSection strings is restricted in src code. Use TopLevelSection enum instead',
                },
                {
                    selector:
                        'Literal[value=/^(Output|Mapping|Metadata|Rule|Transform|AWSTemplateFormatVersion|ForEachResource)$/]',
                    message: 'Usage of raw EntityType strings is restricted in src code. Use EntityType enum instead',
                },
                {
                    selector:
                        'Literal[value=/^Fn::(Base64|Cidr|FindInMap|ForEach|GetAtt|GetAZs|ImportValue|Join|Length|Select|Split|Sub|ToJsonString|Transform|And|Equals|If|Not|Or|Contains|EachMemberEquals|EachMemberIn|RefAll|ValueOf|ValueOfAll|Implies)$/]',
                    message:
                        'Usage of raw IntrinsicFunction strings is restricted in src code. Use IntrinsicFunction enum instead',
                },
                {
                    selector:
                        'Literal[value=/^AWS::(AccountId|Region|StackId|StackName|NotificationARNs|NoValue|Partition|URLSuffix)$/]',
                    message:
                        'Usage of raw PseudoParameter strings is restricted in src code. Use PseudoParameter enum instead',
                },
                {
                    selector:
                        'Literal[value=/^(CreationPolicy|DeletionPolicy|UpdatePolicy|UpdateReplacePolicy|DependsOn|Metadata)$/]',
                    message:
                        'Usage of raw ResourceAttribute strings is restricted in src code. Use ResourceAttribute enum instead',
                },
            ],
            'no-restricted-imports': [
                'error',
                {
                    paths: [
                        {
                            name: 'os',
                            importNames: ['userInfo'],
                            message: 'userInfo is not supported in sandbox Linux environments',
                        },
                        {
                            name: 'fs',
                            importNames: ['readFileSync', 'readFile'],
                            message: 'Use methods in File.ts',
                        },
                        {
                            name: 'fs/promises',
                            importNames: ['readFile'],
                            message: 'Use methods in File.ts',
                        },
                    ],
                    patterns: [
                        {
                            group: ['**/ArtifactsDir'],
                            message: 'Use Storage.ts instead. ArtifactsDir is deprecated.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['tst/**'],
        plugins: {
            vitest,
        },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals,
            },
        },
        rules: {
            ...vitest.configs.recommended.rules,
            'vitest/no-disabled-tests': 'error',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'unicorn/no-useless-undefined': 'off',
            'unicorn/numeric-separators-style': 'off',
            'import/no-namespace': 'off',
            'unicorn/no-null': 'off',
            'unicorn/consistent-function-scoping': 'off',
            'import/first': 'off',
            'unicorn/switch-case-braces': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        files: ['tst/integration/**'],
        rules: {
            'vitest/expect-expect': 'off',
        },
    },
    {
        files: ['tools/**'],
        rules: {
            'no-console': 'off',
            'no-empty': 'off',
            'import/order': 'off',
            'import/first': 'off',
            'import/no-namespace': 'off',
            'import/no-unresolved': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'unicorn/import-style': 'off',
            'unicorn/no-null': 'off',
            'unicorn/prefer-string-replace-all': 'off',
            'unicorn/prefer-top-level-await': 'off',
        },
    },
    eslintPluginPrettierRecommended, // Must be last to override other configs
]);
