package main

import (
	"cfn-init/internal"
	"cfn-init/internal/environment"
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

var environmentCmd = &cobra.Command{
	Use:   "environment",
	Short: "Manage CloudFormation environments",
	Long:  "Add, update, remove, and list CloudFormation deployment environments",
}

var addEnvCmd = &cobra.Command{
	Use:   "add",
	Short: "Add multiple environments from JSON configuration",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		environmentsJSON, _ := cmd.Flags().GetString("environments")
		if environmentsJSON == "" {
			return fmt.Errorf("environments JSON configuration is required")
		}

		var envConfigs struct {
			Environments []internal.EnvironmentConfig `json:"environments"`
		}

		if err := json.Unmarshal([]byte(environmentsJSON), &envConfigs); err != nil {
			return fmt.Errorf("invalid JSON environments config: %w", err)
		}

		return environment.AddEnvironments(envConfigs.Environments)
	},
}

var updateEnvCmd = &cobra.Command{
	Use:   "update <env-name>",
	Short: "Update an existing environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		var newName, newProfile *string

		if cmd.Flags().Changed("name") {
			name, _ := cmd.Flags().GetString("name")
			newName = &name
		}
		if cmd.Flags().Changed("profile") {
			profile, _ := cmd.Flags().GetString("profile")
			newProfile = &profile
		}

		return environment.UpdateEnvironment(args[0], newName, newProfile)
	},
}

var removeEnvCmd = &cobra.Command{
	Use:   "remove <env-name>",
	Short: "Remove an environment",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		return environment.RemoveEnvironment(args[0])
	},
}

var listEnvCmd = &cobra.Command{
	Use:   "list",
	Short: "List all environments",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		envs, err := environment.ListEnvironments()
		if err != nil {
			return err
		}

		if len(envs) == 0 {
			fmt.Println("No environments found")
			return nil
		}

		fmt.Println("Environments:")
		for name, profile := range envs {
			fmt.Printf("  %s -> %s\n", name, profile)
		}
		return nil
	},
}

var addEnvironmentFilesCmd = &cobra.Command{
	Use:   "add-environment-files <env-name>",
	Short: "Add files to environment folder",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		paramFiles, _ := cmd.Flags().GetStringSlice("parameters-files")
		tagFiles, _ := cmd.Flags().GetStringSlice("tags-files")
		gitSyncFiles, _ := cmd.Flags().GetStringSlice("gitsync-files")

		return environment.AddFiles(args[0], paramFiles, tagFiles, gitSyncFiles)
	},
}

var addMultipleEnvCmd = &cobra.Command{
	Use:   "add-multiple",
	Short: "Add multiple environments from JSON configuration",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, args []string) error {
		environmentsJSON, _ := cmd.Flags().GetString("environments")
		if environmentsJSON == "" {
			return fmt.Errorf("environments JSON configuration is required")
		}

		var envConfigs struct {
			Environments []internal.EnvironmentConfig `json:"environments"`
		}

		if err := json.Unmarshal([]byte(environmentsJSON), &envConfigs); err != nil {
			return fmt.Errorf("invalid JSON environments config: %w", err)
		}

		return environment.AddEnvironments(envConfigs.Environments)
	},
}

func init() {
	updateEnvCmd.Flags().String("name", "", "New environment name")
	updateEnvCmd.Flags().String("profile", "", "New AWS profile")

	addEnvironmentFilesCmd.Flags().StringSlice("parameters-files", nil, "Parameters files to copy to environments folder")
	addEnvironmentFilesCmd.Flags().StringSlice("tags-files", nil, "Tags files to copy to environments folder")
	addEnvironmentFilesCmd.Flags().StringSlice("gitsync-files", nil, "GitSync files to copy to environments folder")

	environmentCmd.AddCommand(addEnvCmd)
	environmentCmd.AddCommand(updateEnvCmd)
	environmentCmd.AddCommand(removeEnvCmd)
	environmentCmd.AddCommand(listEnvCmd)
	environmentCmd.AddCommand(addEnvironmentFilesCmd)
}
