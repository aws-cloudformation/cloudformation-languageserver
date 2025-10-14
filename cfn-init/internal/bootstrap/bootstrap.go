package bootstrap

import (
	"cfn-init/internal/config"
	"cfn-init/internal/permissions"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Init creates a new CloudFormation project with the specified name and base path.
func Init(projectName, basePath string) error {
	projectDir := filepath.Join(basePath, "cfn-project")

	if _, err := os.Stat(projectDir); err == nil {
		return fmt.Errorf("cfn-project directory already exists at %s", projectDir)
	}

	if err := os.MkdirAll(projectDir, permissions.ProjectDir); err != nil {
		return fmt.Errorf("failed to create cfn-project directory: %w", err)
	}
	fmt.Printf("✓ Created %s\n", projectDir)

	projectConfig := generateInitialConfig(projectName)

	if err := config.WriteConfigFile(basePath, projectConfig); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}
	fmt.Printf("✓ Created cfn-config.json\n")

	return nil
}

func generateInitialConfig(projectName string) *config.ProjectConfig {
	return &config.ProjectConfig{
		Version: "1.0",
		Project: config.ProjectInfo{
			Name:    projectName,
			Created: time.Now(),
		},
		Environments: make(map[string]config.Environment),
	}
}
