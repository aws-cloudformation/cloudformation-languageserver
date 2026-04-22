export const parserType: 'wasm' | 'native' = process.env.BUILD_TARGET === 'legacy' ? 'wasm' : 'native';
