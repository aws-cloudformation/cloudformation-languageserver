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

### 2. Generate SBOM

```bash
npm sbom --sbom-format spdx > sbom/sbom.json
jq -r '["Name","SPDXID","Version","DownloadLocation","License"] as $header | $header, (.packages[] | select(.name != "@aws/cloudformation-languageserver") | [.name, .SPDXID, .versionInfo, .downloadLocation, .licenseDeclared]) | @csv' sbom/sbom.json > sbom/sbom.csv
```

### 3. Generate Attribution Document

```bash
generate-attribution
cp oss-attribution/attribution.txt THIRD-PARTY-LICENSES.txt
```

### Misc

#### Check licenses

```bash
license-checker --production --exclude MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD

npx license-checker --json | jq 'to_entries | group_by(.value.licenses) | map({key: .[0].value.licenses, value: map(.key)}) | from_entries'
```
