# Go Attribution Guide

### 0. Install license tools (Only required once)

```bash
go install github.com/google/go-licenses/v2@latest
```

**Note**: Ensure `$GOPATH/bin` is in your PATH:
```bash
export PATH=$PATH:$(go env GOPATH)/bin
```

### 1. Regenerate dependencies first

```bash
go mod tidy
go mod download
```

### 2. Generate Cross-Platform Attribution (Automated)

Use the automated script to generate both files for all Go-supported platforms (go-licenses needs to be ran for each platform because sometimes indirect dependencies change per platform):

```bash
go run generate-attribution.go
```

This script will:
- **Generate `licenses.csv`**: Scans all Go-supported platforms and creates a CSV
- **Generate `THIRD-PARTY-LICENSES.txt`**: Creates attribution document from all platforms

### Template File

The `attribution.tmpl` file contains:

```go
{{range .}}{{.Name}}
{{.Version}} <{{.LicenseURL}}>

{{.LicenseText}}


******************************

{{end}}
```

### Misc

#### Check licenses (Optional - for validation and compliance)

These commands help validate license compliance and prevent prohibited licenses:

```bash
go-licenses check ./... --ignore cfn-init

# Check for forbidden licenses
go-licenses check ./... --ignore cfn-init --disallowed_types=<LICENSE1>,<LICENSE2>

# Allow only specific licenses
go-licenses check ./... --ignore cfn-init --allowed_licenses=<LICENSE1>,<LICENSE2>,<LICENSE3>
```
