// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

const version = "1.0.0"

type ProjectConfig struct {
	Name    string `yaml:"name"`
	Version string `yaml:"version"`
}

var rootCmd = &cobra.Command{
	Use:   "cfn-init",
	Short: "CloudFormation project management CLI",
	Long:  "A CLI tool for creating and managing CloudFormation projects with enhanced IDE integration.",
}

var createCmd = &cobra.Command{
	Use:   "create <project-name>",
	Short: "Create a new CloudFormation project",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		projectName := args[0]
		outputFormat, _ := cmd.Flags().GetString("format")

		// Create minimal project config using yaml.v3
		config := ProjectConfig{
			Name:    projectName,
			Version: "1.0.0",
		}

		yamlData, err := yaml.Marshal(&config)
		if err != nil {
			return fmt.Errorf("failed to marshal config: %w", err)
		}

		fmt.Printf("Creating project: %s (format: %s)\n", projectName, outputFormat)
		fmt.Printf("Config:\n%s", yamlData)
		return nil
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("cfn-init version %s\n", version)
	},
}

func init() {
	createCmd.Flags().StringP("format", "f", "yaml", "Output format (yaml|json)")

	rootCmd.AddCommand(createCmd)
	rootCmd.AddCommand(versionCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
