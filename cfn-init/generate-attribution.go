// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"sort"
	"strings"
)

func main() {
	if err := generateAttribution(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✓ Cross-platform attribution generated successfully!")
}

func generateAttribution() error {
	// Step 1: Generate comprehensive licenses.csv from all platforms
	fmt.Println("=== Generating licenses.csv ===")
	if err := generateLicensesCSV(); err != nil {
		return fmt.Errorf("failed to generate licenses.csv: %w", err)
	}

	// Step 2: Generate THIRD-PARTY-LICENSES.txt from all platforms
	fmt.Println("\n=== Generating THIRD-PARTY-LICENSES.txt ===")
	if err := generateThirdPartyLicenses(); err != nil {
		return fmt.Errorf("failed to generate THIRD-PARTY-LICENSES.txt: %w", err)
	}

	return nil
}

func generateLicensesCSV() error {
	platforms, err := getSupportedPlatforms()
	if err != nil {
		return fmt.Errorf("failed to get platforms: %w", err)
	}

	fmt.Printf("Scanning %d platforms for package dependencies...\n", len(platforms))

	allLicenses := make(map[string]string)

	for _, platform := range platforms {
		fmt.Printf("Retrieving licenses for %s...\n", platform)
		licenses, err := generatePlatformCSV(platform)
		if err != nil {
			fmt.Printf("Warning: Failed to generate for %s: %v\n", platform, err)
			continue
		}

		// Merge licenses
		for pkg, line := range licenses {
			allLicenses[pkg] = line
		}
	}

	// Write combined CSV
	if err := writeCombinedCSV(allLicenses); err != nil {
		return fmt.Errorf("failed to write CSV: %w", err)
	}

	fmt.Printf("✓ Generated licenses.csv with %d unique packages\n", len(allLicenses))
	return nil
}

func generateThirdPartyLicenses() error {
	platforms, err := getSupportedPlatforms()
	if err != nil {
		return fmt.Errorf("failed to get platforms: %w", err)
	}

	fmt.Printf("Generating attribution text across %d platforms...\n", len(platforms))

	allAttributions := make(map[string]string)

	for _, platform := range platforms {
		fmt.Printf("Generating attribution for %s...\n", platform)
		attribution, err := generatePlatformAttribution(platform)
		if err != nil {
			fmt.Printf("Warning: Failed to generate attribution for %s: %v\n", platform, err)
			continue
		}

		// Parse and merge attribution text
		packageAttributions := parseAttributionText(attribution)
		for pkg, text := range packageAttributions {
			allAttributions[pkg] = text
		}
	}

	// Write combined attribution
	if err := writeCombinedAttribution(allAttributions); err != nil {
		return fmt.Errorf("failed to write attribution: %w", err)
	}

	fmt.Printf("✓ Generated THIRD-PARTY-LICENSES.txt with %d package attributions\n", len(allAttributions))
	return nil
}

func getSupportedPlatforms() ([]string, error) {
	cmd := exec.Command("go", "tool", "dist", "list")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var platforms []string
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			// Extract OS part (before the slash)
			parts := strings.Split(line, "/")
			if len(parts) > 0 {
				platforms = append(platforms, parts[0])
			}
		}
	}

	// Deduplicate
	platformSet := make(map[string]bool)
	var uniquePlatforms []string
	for _, p := range platforms {
		if !platformSet[p] {
			platformSet[p] = true
			uniquePlatforms = append(uniquePlatforms, p)
		}
	}

	return uniquePlatforms, nil
}

func generatePlatformCSV(platform string) (map[string]string, error) {
	goLicensesPath := os.Getenv("HOME") + "/go/bin/go-licenses"
	cmd := exec.Command(goLicensesPath, "report", "./...", "--ignore", "cfn-init")

	// Set environment variables
	env := append(os.Environ(), "GOOS="+platform, "GOPROXY=direct")

	// Enable CGO for platforms that require it
	if platform == "ios" || platform == "android" {
		env = append(env, "CGO_ENABLED=1")
	} else {
		env = append(env, "CGO_ENABLED=0")
	}

	cmd.Env = env

	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	licenses := make(map[string]string)
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			// Extract package name (first field)
			parts := strings.Split(line, ",")
			if len(parts) > 0 {
				pkg := parts[0]
				licenses[pkg] = line
			}
		}
	}

	return licenses, nil
}

func writeCombinedCSV(allLicenses map[string]string) error {
	// Sort packages for consistent output
	var packages []string
	for pkg := range allLicenses {
		packages = append(packages, pkg)
	}
	sort.Strings(packages)

	// Write to licenses.csv
	file, err := os.Create("licenses.csv")
	if err != nil {
		return err
	}
	defer file.Close()

	for _, pkg := range packages {
		if _, err := file.WriteString(allLicenses[pkg] + "\n"); err != nil {
			return err
		}
	}

	return nil
}

func generatePlatformAttribution(platform string) (string, error) {
	goLicensesPath := os.Getenv("HOME") + "/go/bin/go-licenses"
	cmd := exec.Command(goLicensesPath, "report", "./...", "--ignore", "cfn-init", "--template", "attribution.tmpl")
	env := append(os.Environ(), "GOOS="+platform, "GOPROXY=direct")
	if platform == "ios" {
		env = append(env, "CGO_ENABLED=1")
	} else {
		env = append(env, "CGO_ENABLED=0")
	}
	cmd.Env = env

	output, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(output), nil
}

func parseAttributionText(attribution string) map[string]string {
	packageAttributions := make(map[string]string)
	separator := "******************************"
	sections := strings.Split(attribution, separator)

	for i, section := range sections {
		_ = i // unused but needed for index
		section = strings.TrimSpace(section)
		if section == "" {
			continue
		}

		// Find package name in first non-empty line
		lines := strings.Split(section, "\n")
		var packageName string
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" && strings.Contains(line, "/") {
				packageName = line
				break
			}
		}

		if packageName != "" {
			packageAttributions[packageName] = section
		}
	}

	return packageAttributions
}

func writeCombinedAttribution(allAttributions map[string]string) error {
	// Sort packages for consistent output
	var packages []string
	for pkg := range allAttributions {
		packages = append(packages, pkg)
	}
	sort.Strings(packages)

	// Write combined attribution
	file, err := os.Create("THIRD-PARTY-LICENSES.txt")
	if err != nil {
		return err
	}
	defer file.Close()

	for i, pkg := range packages {
		if _, err := file.WriteString(allAttributions[pkg]); err != nil {
			return err
		}
		// Add separator between packages, but not after the last one
		if i < len(packages)-1 {
			if _, err := file.WriteString("\n\n******************************\n\n"); err != nil {
				return err
			}
		}
	}

	return nil
}
