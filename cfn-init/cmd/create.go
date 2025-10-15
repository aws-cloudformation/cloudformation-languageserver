package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"cfn-init/internal"
	"cfn-init/internal/bootstrap"
	"cfn-init/internal/environment"

	"github.com/spf13/cobra"
)

// CreateInputs holds the user input parameters for project creation.
type CreateInputs struct {
	ProjectName  string                       `json:"projectName"`
	ProjectPath  string                       `json:"projectPath"`
	Environments []internal.EnvironmentConfig `json:"environments,omitempty"`
}

// CreateCmd is the create command's entrypoint
var CreateCmd = &cobra.Command{
	Use:   "create [project-name]",
	Short: "Create a complete CloudFormation project",
	Long:  "Creates a new CloudFormation project. If no project name is provided, interactive prompts will guide you through the setup process.",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		scanner := bufio.NewScanner(os.Stdin)

		inputs, err := collectInputs(cmd, args, scanner)
		if err != nil {
			return err
		}

		if err := validateInputs(inputs); err != nil {
			return err
		}

		return executeCreate(inputs)
	},
}

func collectInputs(cmd *cobra.Command, args []string, scanner *bufio.Scanner) (*CreateInputs, error) {
	inputs := &CreateInputs{}
	isInteractive := len(args) == 0

	// Get project name
	if len(args) > 0 {
		inputs.ProjectName = args[0]
	} else {
		fmt.Print("Enter project name: ")
		scanner.Scan()
		inputs.ProjectName = strings.TrimSpace(scanner.Text())
	}

	// Get project path
	inputs.ProjectPath, _ = cmd.Flags().GetString("project-path")
	if isInteractive && !cmd.Flags().Changed("project-path") {
		fmt.Print("Enter project path (press Enter for current directory): ")
		scanner.Scan()
		input := strings.TrimSpace(scanner.Text())
		if input != "" {
			inputs.ProjectPath = input
		}
	}

	// Check if JSON environments config is provided
	environmentsJSON, _ := cmd.Flags().GetString("environments")
	if environmentsJSON != "" {
		var configData CreateInputs
		if err := json.Unmarshal([]byte(environmentsJSON), &configData); err != nil {
			return nil, fmt.Errorf("invalid JSON environments config: %w", err)
		}
		// Use environments from JSON config
		inputs.Environments = configData.Environments
		return inputs, nil
	}

	// Interactive environment collection
	if isInteractive {
		inputs.Environments = collectEnvironmentsInteractively(scanner)
	}

	return inputs, nil
}

func validateInputs(inputs *CreateInputs) error {
	if inputs.ProjectName == "" {
		return fmt.Errorf("project name is required")
	}

	projectDir := filepath.Join(inputs.ProjectPath, "cfn-project")
	if _, err := os.Stat(projectDir); err == nil {
		return fmt.Errorf("cfn-project directory already exists at %s", projectDir)
	}

	// Validate environments
	for _, env := range inputs.Environments {
		if env.Name == "" {
			return fmt.Errorf("environment name is required")
		}
		if env.AwsProfile == "" {
			return fmt.Errorf("aws profile is required for environment '%s'", env.Name)
		}
	}

	return nil
}

func executeCreate(inputs *CreateInputs) error {
	fmt.Printf("\nCreating project '%s'...\n", inputs.ProjectName)
	if err := bootstrap.Init(inputs.ProjectName, inputs.ProjectPath); err != nil {
		return err
	}

	// Change to project directory for environment operations
	originalDir, _ := os.Getwd()
	projectDir := filepath.Join(inputs.ProjectPath, "cfn-project")
	if err := os.Chdir(filepath.Dir(projectDir)); err != nil {
		return fmt.Errorf("failed to change directory: %w", err)
	}
	defer os.Chdir(originalDir)

	// Add environments if specified
	if len(inputs.Environments) > 0 {
		if err := environment.AddEnvironments(inputs.Environments); err != nil {
			return err
		}
	}

	fmt.Printf("\n✓ Create complete! Project created at: %s\n", projectDir)
	return nil
}

func init() {
	CreateCmd.Flags().StringP("project-path", "p", ".", "Path where to create the cfn-project directory")
	CreateCmd.Flags().StringP("environments", "e", "", "JSON configuration for environments")
}

func collectEnvironmentsInteractively(scanner *bufio.Scanner) []internal.EnvironmentConfig {
	var environments []internal.EnvironmentConfig

	for {
		fmt.Print("\nWould you like to add an environment? (y/n): ")
		scanner.Scan()
		response := strings.ToLower(strings.TrimSpace(scanner.Text()))

		if response != "y" && response != "yes" {
			break
		}

		env := internal.EnvironmentConfig{}

		// Get environment name
		fmt.Print("Environment name: ")
		scanner.Scan()
		env.Name = strings.TrimSpace(scanner.Text())

		// Get AWS profile
		fmt.Print("AWS profile: ")
		scanner.Scan()
		env.AwsProfile = strings.TrimSpace(scanner.Text())

		// Get parameters files
		fmt.Print("Parameters files (comma-separated, press Enter to skip): ")
		scanner.Scan()
		if input := strings.TrimSpace(scanner.Text()); input != "" {
			env.ParametersFiles = parseFileList(input)
		}

		// Get tags files
		fmt.Print("Tags files (comma-separated, press Enter to skip): ")
		scanner.Scan()
		if input := strings.TrimSpace(scanner.Text()); input != "" {
			env.TagsFiles = parseFileList(input)
		}

		// Get GitSync files
		fmt.Print("GitSync files (comma-separated, press Enter to skip): ")
		scanner.Scan()
		if input := strings.TrimSpace(scanner.Text()); input != "" {
			env.GitSyncFiles = parseFileList(input)
		}

		environments = append(environments, env)

		fmt.Printf("✓ Environment '%s' configured\n", env.Name)
	}

	return environments
}

func parseFileList(input string) []string {
	files := make([]string, 0)
	if input == "" {
		return files
	}
	for _, file := range strings.Split(input, ",") {
		if trimmed := strings.TrimSpace(file); trimmed != "" {
			files = append(files, trimmed)
		}
	}
	return files
}
