const { resolve, join } = require('path');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const BUNDLE_NAME = 'cfn-lsp-server-standalone';
const Package = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const PackageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const ExternalsDeps = Package.externalDependencies;
const NativePrebuilds = Package.nativePrebuilds;
const UnusedDeps = Package.unusedDependencies;

const COPY_FILES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-LICENSES.txt', 'README.md'];
const KEEP_FILES = [
    '.cjs',
    '.gyp',
    '.js',
    '.mjs',
    '.node',
    '.wasm',
    'mappingTable.json',
    'package.json',
    'pyodide-lock.json',
    'python_stdlib.zip',
];
const IGNORE_PATHS = ['/bin/', '/test/', '/benchmarks/', '/examples/'];

function generateExternals() {
    const externals = [...ExternalsDeps, ...UnusedDeps];
    const collected = new Set(externals);
    const queue = [...externals];

    while (queue.length > 0) {
        const dep = queue.shift();
        const pkgInfo = PackageLock.packages?.[`node_modules/${dep}`];

        if (pkgInfo?.dependencies) {
            for (const subDep of Object.keys(pkgInfo.dependencies)) {
                if (!collected.has(subDep) && !subDep.startsWith('@types/') && !pkgInfo.dev && !pkgInfo.optional) {
                    collected.add(subDep);
                    queue.push(subDep);
                }
            }
        }
    }

    for (const dep of NativePrebuilds) {
        collected.add(dep);
    }
    return Array.from(collected).sort();
}

const EXTERNALS = generateExternals();

function createPlugins(isDevelopment, outputPath, mode, env) {
    const plugins = [];

    plugins.push(
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: resolve(outputPath, `../${mode}-analysis.html`),
        }),
    );

    // Copy relationship schemas for both development and production
    plugins.push(
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'assets',
                    to: 'assets',
                },
                {
                    from: 'vendor/cfn-guard/guard_bg.wasm',
                    to: 'guard_bg.wasm',
                },
                {
                    from: 'vendor/cfn-guard/guard.js',
                    to: 'vendor/cfn-guard/guard.js',
                },
                {
                    from: 'vendor/cfn-guard/index.js',
                    to: 'vendor/cfn-guard/index.js',
                },
                {
                    from: 'vendor/cfn-guard/package.json',
                    to: 'vendor/cfn-guard/package.json',
                },
                {
                    from: 'vendor/cfn-guard/guard_bg.wasm',
                    to: 'vendor/cfn-guard/guard_bg.wasm',
                },
            ],
        }),
    );

    if (!isDevelopment) {
        const tmpDir = path.join(__dirname, 'tmp-node-modules');
        console.debug('Working in tmpDir:', tmpDir);

        plugins.push({
            apply: (compiler) => {
                compiler.hooks.beforeRun.tapAsync('InstallDependencies', (compilation, callback) => {
                    try {
                        console.log('[InstallDependencies] Starting dependency installation...');

                        const tmpPkg = {
                            ...Package,
                            main: `./${BUNDLE_NAME}.js`,
                        };

                        delete tmpPkg['scripts'];
                        delete tmpPkg['devDependencies'];
                        delete tmpPkg['externalDependencies'];
                        delete tmpPkg['nativePrebuilds'];

                        console.log('[InstallDependencies] Cleaning temp directory...');
                        if (fs.existsSync(tmpDir)) {
                            fs.rmSync(tmpDir, { recursive: true, force: true });
                        }
                        fs.mkdirSync(tmpDir, { recursive: true });
                        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(tmpPkg, null, 2));
                        fs.copyFileSync('package-lock.json', `${tmpDir}/package-lock.json`);

                        console.log('[InstallDependencies] Running npm ci --omit=dev');
                        execSync('npm ci --omit=dev', { cwd: tmpDir, stdio: 'inherit' });

                        const externals = ExternalsDeps.map((dep) => {
                            if (dep === 'cfn-guard') {
                                return `${dep}@${PackageLock.packages[`node_modules/${dep}`].version}`;
                            }
                            return `${dep}@${PackageLock.packages[`node_modules/${dep}`].version}`;
                        });
                        console.log(
                            `[InstallDependencies] Installing externals: ${JSON.stringify(externals, null, 2)}`,
                        );
                        execSync(`npm install --save-exact ${externals.join(' ')}`, {
                            cwd: tmpDir,
                            stdio: 'inherit',
                        });
                        callback();
                    } catch (error) {
                        console.error('[InstallDependencies] Error:', error);
                        callback(error);
                    }
                });

                compiler.hooks.done.tap('CleanupTemp', () => {
                    console.log('[CleanupTemp] Cleaning up temporary files...');
                    if (fs.existsSync(tmpDir)) {
                        console.log(`[CleanupTemp] Removing: ${tmpDir}`);
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    }

                    const dotPackageLock = 'bundle/production/node_modules/.package-lock.json';
                    if (fs.existsSync(dotPackageLock)) {
                        console.log(`[CleanupTemp] Removing: ${dotPackageLock}`);
                        fs.rmSync(dotPackageLock, { force: true });
                    }
                    console.log('[CleanupTemp] Cleanup complete');
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
                            const relativePath = resourcePath.replace(process.cwd(), '');
                            const isExternal = EXTERNALS.some((external) => {
                                return relativePath.includes(`/node_modules/${external}/`);
                            });
                            const keep = KEEP_FILES.some((pattern) => relativePath.endsWith(pattern));
                            const ignore = IGNORE_PATHS.some((pattern) => relativePath.includes(pattern));
                            return isExternal && keep && !ignore;
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

        plugins.push(
            new webpack.IgnorePlugin({
                resourceRegExp: /^@opentelemetry\/(winston-transport|exporter-jaeger)$/,
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
    stats: 'normal',
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
    console.info(`Platform: ${process.platform} Arch: ${process.arch}`);
    console.info(`Node.js ${process.version} Versions: ${JSON.stringify(process.versions, null, 2)}`);
    console.info(`Output path: ${outputPath}`);

    return {
        ...baseConfig,
        mode: isDevelopment ? 'development' : 'production',
        devtool: isDevelopment ? 'eval-source-map' : 'source-map',
        output: {
            clean: true,
            filename: `[name].js`,
            chunkFilename: `[name].js`,
            path: outputPath,
            library: {
                type: 'commonjs2',
            },
        },
        externals: isDevelopment ? [nodeExternals()] : EXTERNALS,
        optimization: {
            minimize: false,
            moduleIds: 'named',
            chunkIds: 'named',
            usedExports: true,
            sideEffects: false,
            splitChunks: {
                chunks: 'all',
            },
        },
        plugins: createPlugins(isDevelopment, outputPath, mode, awsEnv),
    };
};
