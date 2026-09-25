const { resolve, join } = require('path');
const { isBuiltin } = require('module');
const nodeExternals = require('webpack-node-externals');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const webpack = require('webpack');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const BUNDLE_NAME = 'cfn-lsp-server-standalone';
const BIN_NAME = 'cloudformation-languageserver';
const Package = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const PackageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const ExternalsDeps = Package.externalDependencies;
const NativePrebuilds = Package.nativePrebuilds;
const RequiredPeerDeps = Package.requiredPeerDeps;

const COPY_FILES = ['LICENSE', 'NOTICE', 'THIRD-PARTY-LICENSES.txt', 'README.md'];
const KEEP_FILES = [
    '.cjs',
    '.gyp',
    '.js',
    '.js.map',
    '.mjs',
    '.node',
    '.wasm',
    'mappingTable.json',
    'package.json',
    'pyodide-lock.json',
    'python_stdlib.zip',
];
const IGNORE_PATHS = ['/bin/', '/test/', '/benchmarks/', '/examples/'];

// The bundle directory doubles as the npm package: node_modules/ is never packed by npm, and the
// co-distributed cfn-init binary under bin/ is left out because the server does not invoke it.
const PUBLISHED_FILES = [
    '/*.js',
    '/*.js.map',
    '/*.wasm',
    '/assets/',
    '/vendor/',
    '/NOTICE',
    '/THIRD-PARTY-LICENSES.txt',
];
// The root engines pin the development toolchain; the published package only needs what the bundle and its
// runtime dependencies (notably @aws/cloudformation-validate, node >= 20) require, as exercised by the
// post-release soak matrix.
const PUBLISHED_ENGINES = { node: '>=20' };
const DEVELOPMENT_ONLY_KEYS = [
    'private',
    'scripts',
    'devDependencies',
    'externalDependencies',
    'nativePrebuilds',
    'requiredPeerDeps',
    'rebuildDependencies',
];

function omitDevelopmentOnlyKeys(manifest) {
    const runtimeManifest = { ...manifest };
    for (const key of DEVELOPMENT_ONLY_KEYS) {
        delete runtimeManifest[key];
    }
    return runtimeManifest;
}

function packageNameOf(request) {
    const segments = request.split('/');
    return request.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

// The compiled module graph reveals the transitive packages the bundle `require()`s directly (e.g. `yaml`,
// `lru-cache`), while the declared externals also cover packages loaded by name at runtime, such as pino
// resolving its `pino-pretty` transport target itself. npm resolves everything below these (including the
// platform-specific native prebuilds) on the consumer's machine.
function collectRuntimeDependencies(compilation) {
    const requestedPackages = [...compilation.modules]
        .filter((module) => module instanceof webpack.ExternalModule && !isBuiltin(module.userRequest))
        .map((module) => packageNameOf(module.userRequest));

    const runtimeDependencies = {};
    for (const packageName of [...ExternalsDeps, ...requestedPackages].sort()) {
        const lockEntry = PackageLock.packages[`node_modules/${packageName}`];
        if (!lockEntry) {
            throw new Error(`External "${packageName}" is not in package-lock.json and cannot be published`);
        }
        runtimeDependencies[packageName] = lockEntry.version;
    }
    return runtimeDependencies;
}

// Pulled out of the spread so dependencies and overrides land last.
function createPublishedManifest(runtimeDependencies) {
    const { dependencies: _, overrides, ...metadata } = omitDevelopmentOnlyKeys(Package);
    return {
        ...metadata,
        main: `./${BUNDLE_NAME}.js`,
        bin: { [BIN_NAME]: `./${BUNDLE_NAME}.js` },
        files: PUBLISHED_FILES,
        engines: PUBLISHED_ENGINES,
        scripts: { start: `node ./${BUNDLE_NAME}.js --stdio` },
        dependencies: runtimeDependencies,
        overrides,
    };
}

function generateExternals() {
    const externals = [...ExternalsDeps, ...RequiredPeerDeps];
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

    // When a package is externalized, webpack emits `require("pkg")` and expects
    // it to exist at `bundle/production/node_modules/pkg/` at runtime.
    //
    // The transitive walk above can collect packages like "minimatch" that appear
    // in the lockfile only as a dev dependency at the top level (e.g. v10 for eslint),
    // while the production copy lives nested (e.g. glob/node_modules/minimatch v9).
    // The bundle's node_modules/ (built with --omit=dev) won't have them at the
    // top level, so `require("minimatch")` fails at runtime.
    //
    // Fix: exclude any transitively-collected dep whose top-level lockfile entry
    // is dev-only. Webpack will bundle it inline instead.
    const filtered = Array.from(collected).filter((dep) => {
        const topLevelInfo = PackageLock.packages?.[`node_modules/${dep}`];
        if (topLevelInfo?.dev && !ExternalsDeps.includes(dep) && !RequiredPeerDeps.includes(dep) && !NativePrebuilds.includes(dep)) {
            console.warn(`[generateExternals] Excluding "${dep}" - dev-only at top level, would not resolve at runtime`);
            return false;
        }
        return true;
    });

    return filtered.sort();
}

const EXTERNALS = generateExternals();

function createPlugins(isDevelopment, outputPath, mode, env, rebuild = false, buildTarget = '', skipWheels = false) {
    const plugins = [];

    plugins.push(
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: resolve(outputPath, `../${mode}-analysis.html`),
        }),
    );

    // Download Python wheels at build time so they don't need to be committed to git
    if (!skipWheels) {
        plugins.push({
            apply: (compiler) => {
                compiler.hooks.beforeRun.tapAsync('DownloadWheels', (_compilation, callback) => {
                    try {
                        console.log('[DownloadWheels] Downloading Python wheels...');
                        execSync('npm run download-wheels', { cwd: __dirname, stdio: 'inherit' });
                        console.log('[DownloadWheels] Done');
                        callback();
                    } catch (error) {
                        console.error('[DownloadWheels] Error:', error);
                        callback(error);
                    }
                });
            },
        });
    } else {
        console.log('[DownloadWheels] Skipped (skipWheels=true)');
    }

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

                        const tmpPkg = omitDevelopmentOnlyKeys(Package);

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
                            return `${dep}@${PackageLock.packages[`node_modules/${dep}`].version}`;
                        });
                        console.log(
                            `[InstallDependencies] Installing externals: npm install --save-exact ${externals.join(' ')}`,
                        );
                        execSync(`npm install --save-exact ${externals.join(' ')}`, {
                            cwd: tmpDir,
                            stdio: 'inherit',
                        });

                        if (rebuild) {
                            const rebuildDeps = Package.rebuildDependencies || [];
                            for (const dep of rebuildDeps) {
                                const prebuildPath = path.join(tmpDir, 'node_modules', dep, 'prebuilds');
                                if (fs.existsSync(prebuildPath)) {
                                    console.log(`[InstallDependencies] Removing prebuilds: ${prebuildPath}`);
                                    fs.rmSync(prebuildPath, { recursive: true, force: true });
                                }
                            }

                            console.log(`[InstallDependencies] Rebuilding: npm rebuild ${rebuildDeps.join(' ')}`);
                            execSync(`npm rebuild ${rebuildDeps.join(' ')}`, { cwd: tmpDir, stdio: 'inherit' });
                        }

                        callback();
                    } catch (error) {
                        console.error('[InstallDependencies] Error:', error);
                        callback(error);
                    }
                });

                compiler.hooks.done.tap('WritePublishedManifest', (stats) => {
                    const manifest = createPublishedManifest(collectRuntimeDependencies(stats.compilation));
                    fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify(manifest, null, 2));
                    console.log('[WritePublishedManifest] Runtime dependencies:', manifest.dependencies);
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

    // Lets npm expose the server through `bin` (`npx cloudformation-languageserver --stdio`).
    plugins.push(
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true,
            entryOnly: true,
            test: new RegExp(`^${BUNDLE_NAME}\\.js$`),
        }),
    );

    plugins.push(
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(mode),
            'process.env.AWS_ENV': JSON.stringify(env),
            'process.env.BUILD_TARGET': JSON.stringify(buildTarget),
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
    const rebuild = env.rebuild === 'true' || env.rebuild === true;
    const buildTarget = env.buildTarget || '';
    const skipWheels = env.skipWheels === 'true' || env.skipWheels === true;

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
    console.info(`Platform: ${process.platform}, Arch: ${process.arch}, Rebuild: ${rebuild}, SkipWheels: ${skipWheels}`);
    console.info(`Node.js ${process.version}, Versions: ${JSON.stringify(process.versions, null, 2)}`);
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
        plugins: createPlugins(isDevelopment, outputPath, mode, awsEnv, rebuild, buildTarget, skipWheels),
    };
};
