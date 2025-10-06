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

const COPY_FILES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-LICENSES.txt', 'README.md'];
const PLATFORMS = ['linux', 'win32', 'darwin'];
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
    const externals = Package.externalDependencies;
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

    for (const dep of Object.keys(Package.nativePrebuilds)) {
        collected.add(dep);
    }
    return Array.from(collected).sort();
}

const EXTERNALS = generateExternals();

function createPlugins(isDevelopment, outputPath, mode, env, targetPlatform, targetArch) {
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
        console.debug('Working in tmpDir:', tmpDir);

        plugins.push({
            apply: (compiler) => {
                compiler.hooks.beforeRun.tapAsync('InstallDependencies', (compilation, callback) => {
                    try {
                        const tmpPkg = {
                            ...Package,
                            main: `./${BUNDLE_NAME}.js`,
                        };

                        delete tmpPkg['scripts'];
                        delete tmpPkg['devDependencies'];
                        delete tmpPkg['externalDependencies'];
                        delete tmpPkg['nativePrebuilds'];

                        if (fs.existsSync(tmpDir)) {
                            fs.rmSync(tmpDir, { recursive: true, force: true });
                        }
                        fs.mkdirSync(tmpDir, { recursive: true });
                        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(tmpPkg, null, 2));
                        fs.copyFileSync('package-lock.json', `${tmpDir}/package-lock.json`);

                        execSync('npm ci --omit=dev', { cwd: tmpDir, stdio: 'inherit' });
                        const otherDeps = Object.entries(Package.nativePrebuilds)
                            .filter(([key, _version]) => {
                                return key.endsWith(`${targetPlatform}-${targetArch}`);
                            })
                            .map(([key, version]) => {
                                return `${key}@${version}`;
                            })
                            .join(' ');

                        execSync(`npm install --save-exact --force ${otherDeps}`, { cwd: tmpDir, stdio: 'inherit' });
                        callback();
                    } catch (error) {
                        callback(error);
                    }
                });

                compiler.hooks.afterEmit.tap('CleanUnusedNativeModules', () => {
                    const nodeModulesPath = path.join(outputPath, 'node_modules');

                    if (!fs.existsSync(nodeModulesPath)) return;

                    function cleanPlatformDirs(dir) {
                        if (!fs.existsSync(dir)) return;

                        const entries = fs.readdirSync(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            if (!entry.isDirectory()) continue;

                            const entryPath = path.join(dir, entry.name);
                            const isPlatformDir = PLATFORMS.some((p) => entry.name.includes(`${p}-`));
                            const shouldKeep = entry.name.includes(`${targetPlatform}-${targetArch}`);

                            if (isPlatformDir && !shouldKeep) {
                                fs.rmSync(entryPath, { recursive: true, force: true });
                                console.log(`Deleted: ${entryPath}`);
                            } else if (entry.name === 'prebuilds') {
                                cleanPlatformDirs(entryPath);
                            } else {
                                cleanPlatformDirs(entryPath);
                            }
                        }
                    }

                    cleanPlatformDirs(nodeModulesPath);
                });

                compiler.hooks.done.tap('CleanupTemp', () => {
                    if (fs.existsSync(tmpDir)) {
                        fs.rmSync(tmpDir, { recursive: true, force: true });
                    }

                    const dotPackageLock = 'bundle/production/node_modules/.package-lock.json';
                    if (fs.existsSync(dotPackageLock)) {
                        fs.rmSync(dotPackageLock, { force: true });
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
    const targetPlatform = env.platform || process.platform;
    const targetArch = env.arch || process.arch;

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
    console.info(`Platform: ${targetPlatform}`);
    console.info(`Arch: ${targetArch}`);
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
        externals: isDevelopment ? [nodeExternals()] : EXTERNALS,
        optimization: {
            minimize: false,
            moduleIds: 'deterministic',
            chunkIds: 'deterministic',
            usedExports: true,
            sideEffects: false,
            splitChunks: {
                chunks: 'all',
            },
        },
        plugins: createPlugins(isDevelopment, outputPath, mode, awsEnv, targetPlatform, targetArch),
    };
};
