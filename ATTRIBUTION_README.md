# NPM Attribution Guide

### 0. Install license tools (Only required once)

```bash
brew install jq
npm i -g oss-attribution-generator
npm i -g license-checker
```

### 1. Regenerate dependencies first

```bash
npm run clean
npm install
```

### 2. Generate Attribution

```bash
ts-node tools/generate-attribution.ts
```

### Misc

#### Check licenses

```bash
license-checker --production --exclude MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD

npx license-checker --json | jq 'to_entries | group_by(.value.licenses) | map({key: .[0].value.licenses, value: map(.key)}) | from_entries'
```
