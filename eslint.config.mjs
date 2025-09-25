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
        '**/*.json',
        '**/*.yaml',
        '**/*.zip',
        '**/.DS_Store',
        '**/.tsbuildinfo',
        '**/*.md',
        'tools/',
        'src/services/guard/assets/**',
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
                        'builtin',   // Node.js built-in modules (fs, path, etc.)
                        'external',  // npm packages
                        'internal',  // Internal modules (configured via settings)
                        'parent',    // Parent directory imports (../)
                        'sibling',   // Same directory imports (./)
                        'index'      // Index file imports (./index)
                    ],
                    'newlines-between': 'never',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true
                    }
                }
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
        files: ['tst/**'],
        plugins: {
            vitest,
        },
        languageOptions: {
            globals: {
                ...vitest.environments.env.globals
            }
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
            '@typescript-eslint/no-unsafe-return': 'off'
        },
    },
    {
        files: ['tst/e2e/**'],
        rules: {
            'vitest/expect-expect': 'off'
        },
    },
    eslintPluginPrettierRecommended, // Must be last to override other configs
]);
