const { resolve, join } = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { minimatch } = require('minimatch');

const BUNDLE_NAME = 'cfn-lsp-server-standalone';

const COPY_FILES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-LICENSES.txt', 'README.md'];
const ALWAYS_IGNORE = ['**/@types/**', '**/typescript/**'];
const IGNORE_PATTERNS = [
    // 1. Tests, Specs, & Benchmarks
    '**/__tests__/**',
    '**/{test,spec}{,s}/**',
    '**/*.{spec,test}.{js,jsx,ts,tsx}',
    '**/test.js',
    '**/spec.js',
    '**/bench.js',
    '**/benchmark.js',
    '**/*bench*/**',

    // 2. Documentation & Project Metadata
    '**/{doc,docs,example{,s},demo{,s},fixture{,s}}/**',
    '**/{README,CHANGELOG,HISTORY,NOTICE,AUTHORS,CONTRIBUTORS}{,.*}',
    '**/README*',
    '**/CHANGELOG*',
    '**/HISTORY*',

    // 3. Config Files & Tooling
    '**/{ts,js}config*.json',
    '**/{vite,webpack,rollup,esbuild,parcel,babel,swc}.config.*',
    '**/.{babelrc,swcrc,npmrc,yarnrc,nvmrc,env}*',
    '**/{.eslint,.prettier,.stylelint}*',
    '**/.{editorconfig,gitattributes,jshintrc,npmignore,nojekyll}',
    '**/commitlint.config.js',
    '**/.release-it*.json',
    '**/.husky/**',
    '**/.github/**',
    '**/.{nycrc,taprc,c8rc}*',

    // 4. Source Code & Type Definitions
    '**/*.{ts,cts,mts}',
    '**/*.d.{ts,cts,mts}',
    '**/*.{flow,coffee,proto,scm}',

    // 5. Assets & Non-Code Files
    '**/*.{css,scss,less,styl}',
    '**/*.{html,md,txt,markdown,doc,jsdoc}',
    '**/*.{png,jpg,jpeg,gif,svg,ico,webp,avif}',
    '**/*.{woff,woff2,eot,ttf,otf}',
    '**/*.zip',

    // 6. Build System & Misc Files
    '**/*.{c,cc,cpp,cxx,h,hpp,hxx,gyp,gypi}',
    '**/Makefile*',
    '**/CMakeLists.txt',
    '**/binding.gyp',
    '**/*.{def,in,1}',

    // 7. IDE, System, & Log Files
    '**/.{idea,vscode,DS_Store}/**',
    '**/{.*.log,*.log}',
    '**/.gitkeep',
    '**/*.map',
    '**/.history/**',

    // 8. Scripts
    '**/.bin/**',
    '**/*.{cmd,sh}',
];

// Keeping license for legal
const KEEP_PATTERNS = ['**/python_stdlib.zip', '**/yaml/dist/doc/**'];

function createPlugins(isDevelopment, outputPath, mode, env) {
    const plugins = [];

    plugins.push(
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: resolve(outputPath, `../${mode}-analysis.html`),
        }),
    );

    // Copy Guard WASM assets and relationship schemas for both development and production
    plugins.push(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'src/services/guard/assets/guard.js',
                    to: 'assets/guard.js',
                },
                {
                    from: 'src/services/guard/assets/guard-wrapper.js',
                    to: 'assets/guard-wrapper.js',
                },
                {
                    from: 'src/services/guard/assets/guard_bg.wasm',
                    to: 'assets/guard_bg.wasm',
                },
                {
                    from: 'src/resources/relationship_schemas.json',
                    to: 'resources/relationship_schemas.json',
                },
            ],
        }),
    );

    if (!isDevelopment) {
        const tmpDir = path.join(__dirname, 'tmp-node-modules');

        plugins.push({
            apply: (compiler) => {
                compiler.hooks.beforeRun.tapAsync('InstallDependencies', (compilation, callback) => {
                    try {
                        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

                        const tmpPkg = {
                            ...pkg,
                            main: `./${BUNDLE_NAME}.js`,
                        };

                        delete tmpPkg['scripts'];
                        delete tmpPkg['devDependencies'];

                        if (fs.existsSync(tmpDir)) {
                            fs.rmSync(tmpDir, { recursive: true, force: true });
                        }
                        fs.mkdirSync(tmpDir, { recursive: true });
                        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(tmpPkg, null, 2));
                        fs.copyFileSync('package-lock.json', `${tmpDir}/package-lock.json`);

                        execSync('npm ci --only=prod', { cwd: tmpDir, stdio: 'inherit' });
                        callback();
                    } catch (error) {
                        callback(error);
                    }
                });

                compiler.hooks.done.tap('CleanupTemp', () => {
                    if (fs.existsSync(tmpDir)) {
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    }

                    const dotPackageLock = 'bundle/production/node_modules/.package-lock.json';
                    if (fs.existsSync(dotPackageLock)) {
                        fs.rmSync(dotPackageLock);
                    }
                });
            },
        });

        plugins.push(
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.join('tmp-node-modules', 'node_modules'),
                        to: 'node_modules',
                        filter: (resourcePath) => {
                            const relativePath = resourcePath.replaceAll(process.cwd(), '');

                            if (ALWAYS_IGNORE.some((pattern) => minimatch(relativePath, pattern))) {
                                return false;
                            }
                            // If matches KEEP_PATTERNS, always include
                            return (
                                KEEP_PATTERNS.some((pattern) => minimatch(relativePath, pattern)) ||
                                // Otherwise, check if it's not ignored
                                !IGNORE_PATTERNS.some((pattern) => minimatch(relativePath, pattern))
                            );
                        },
                    },
                    {
                        from: 'tmp-node-modules/package.json',
                        to: 'package.json',
                    },
                    ...COPY_FILES.map((file) => {
                        return {
                            from: file,
                            to: file,
                            toType: 'file',
                        };
                    }),
                ],
            }),
        );
    }

    plugins.push(
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(mode),
            'process.env.AWS_ENV': JSON.stringify(env),
        }),
    );

    return plugins;
}

function createOptimization(isDevelopment) {
    const baseOptimization = {
        minimize: false,
    };

    if (isDevelopment) {
        return {
            ...baseOptimization,
            removeAvailableModules: false,
            removeEmptyChunks: false,
            splitChunks: false,
        };
    }

    return {
        ...baseOptimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        usedExports: true,
        sideEffects: false,
    };
}

const baseConfig = {
    target: 'node',
    entry: {
        [BUNDLE_NAME]: './src/app/standalone.ts',
        'pyodide-worker': './src/services/cfnLint/pyodide-worker.ts',
    },
    resolve: {
        extensions: ['.ts', '.js', '.node'],
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.bundle.json',
                            transpileOnly: false,
                        },
                    },
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.node$/,
                use: {
                    loader: 'node-loader',
                    options: {
                        name: '[name].[ext]',
                    },
                },
            },
        ],
    },
    stats: {
        colors: true,
        modules: false,
        children: false,
        chunks: false,
        chunkModules: false,
    },
    performance: {
        hints: 'warning',
    },
};

module.exports = (env = {}) => {
    const mode = env.mode;
    let awsEnv = env.env;

    // Validate mode
    const validModes = ['development', 'production'];
    if (!validModes.includes(mode)) {
        console.error(`Invalid mode: ${mode}. Valid options: ${validModes.join(', ')}`);
        process.exit(1);
    }

    if (mode === 'development') {
        awsEnv = 'alpha';
    }

    // Validate env
    const validEnvs = ['alpha', 'beta', 'prod'];
    if (!validEnvs.includes(awsEnv)) {
        console.error(`Invalid env: ${awsEnv}. Valid options: ${validEnvs.join(', ')}`);
        process.exit(1);
    }

    const outputPath = resolve(join(__dirname, 'bundle', mode));
    const isDevelopment = mode === 'development';

    console.info(`Building server with mode: ${mode}`);
    console.info(`NODE_ENV: ${mode}`);
    console.info(`AWS_ENV: ${awsEnv}`);
    console.info(`Platform: ${process.platform}-${process.arch}`);
    console.info(`Output path: ${outputPath}`);

    return {
        ...baseConfig,
        mode: isDevelopment ? 'development' : 'production',
        devtool: isDevelopment ? 'eval-source-map' : 'source-map',
        output: {
            clean: true,
            filename: `[name].js`,
            path: outputPath,
            library: {
                type: 'commonjs2',
            },
        },
        externals: [nodeExternals()],
        optimization: createOptimization(isDevelopment),
        plugins: createPlugins(isDevelopment, outputPath, mode, awsEnv),
    };
};
