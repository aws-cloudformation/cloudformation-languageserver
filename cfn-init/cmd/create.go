package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"cfn-init/internal/bootstrap"

	"github.com/spf13/cobra"
)

// CreateInputs holds the user input parameters for project creation.
type CreateInputs struct {
	ProjectName string
	ProjectPath string
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
	// If no inputs are given when running create, prompt user for all inputs
	isInteractive := len(args) == 0

	if len(args) > 0 {
		inputs.ProjectName = args[0]
	} else {
		fmt.Print("Enter project name: ")
		scanner.Scan()
		inputs.ProjectName = strings.TrimSpace(scanner.Text())
	}

	inputs.ProjectPath, _ = cmd.Flags().GetString("project-path")
	if isInteractive && !cmd.Flags().Changed("project-path") {
		fmt.Print("Enter project path (press Enter for current directory): ")
		scanner.Scan()
		input := strings.TrimSpace(scanner.Text())
		if input != "" {
			inputs.ProjectPath = input
		}
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

	return nil
}

func executeCreate(inputs *CreateInputs) error {
	fmt.Printf("\nCreating project '%s'...\n", inputs.ProjectName)
	if err := bootstrap.Init(inputs.ProjectName, inputs.ProjectPath); err != nil {
		return err
	}

	fmt.Printf("\n✓ Create complete! Project created at: %s/cfn-project\n", inputs.ProjectPath)
	return nil
}

func init() {
	CreateCmd.Flags().StringP("project-path", "p", ".", "Path where to create the cfn-project directory")
}
