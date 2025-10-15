package environment

import (
	"cfn-init/internal"
	"cfn-init/internal/config"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	ProjectDir      = "cfn-project"
	ConfigFile      = "cfn-config.json"
	EnvironmentsDir = "environments"
)

var allowedExtensions = map[string]bool{
	".json": true,
	".yaml": true,
	".yml":  true,
}

func addEnvironment(envName, awsProfile string) error {
	if !projectExists() {
		return fmt.Errorf("project directory not found")
	}

	if environmentExists(envName) {
		return fmt.Errorf("environment '%s' already exists", envName)
	}

	// Create environment directory
	envDir := getEnvironmentPath(envName)
	if err := os.MkdirAll(envDir, 0755); err != nil {
		return fmt.Errorf("failed to create environment directory: %w", err)
	}

	configFile, err := config.ReadConfigFile(".")
	if err != nil {
		return err
	}

	env := config.Environment{
		Name:    envName,
		Profile: awsProfile,
	}

	configFile.Environments[envName] = env
	return config.WriteConfigFile(".", configFile)
}

// AddEnvironments creates multiple environments with their configurations and files
func AddEnvironments(environments []internal.EnvironmentConfig) error {
	if !projectExists() {
		return fmt.Errorf("project directory not found")
	}

	for _, env := range environments {
		if env.Name == "" {
			return fmt.Errorf("environment name is required")
		}
		if env.AwsProfile == "" {
			return fmt.Errorf("aws profile is required for environment '%s'", env.Name)
		}

		fmt.Printf("Adding environment '%s'...\n", env.Name)
		if err := addEnvironment(env.Name, env.AwsProfile); err != nil {
			return fmt.Errorf("failed to add environment '%s': %w", env.Name, err)
		}

		// Add files if specified
		if len(env.ParametersFiles) > 0 || len(env.TagsFiles) > 0 || len(env.GitSyncFiles) > 0 {
			fmt.Printf("Adding files to environment '%s'...\n", env.Name)
			if err := AddFiles(env.Name, env.ParametersFiles, env.TagsFiles, env.GitSyncFiles); err != nil {
				return fmt.Errorf("failed to add files to environment '%s': %w", env.Name, err)
			}
		}
	}

	fmt.Printf("✓ Successfully added %d environments\n", len(environments))
	return nil
}

// UpdateEnvironment modifies an existing environment
func UpdateEnvironment(envName string, newName, newProfile *string) error {
	configFile, err := getEnvironmentConfig(envName)
	if err != nil {
		return err
	}

	env := configFile.Environments[envName]
	oldDir := getEnvironmentPath(envName)

	if newName != nil && *newName != envName {
		newDir := getEnvironmentPath(*newName)
		if _, err := os.Stat(newDir); err == nil {
			return fmt.Errorf("environment '%s' already exists", *newName)
		}
		if err := os.Rename(oldDir, newDir); err != nil {
			return fmt.Errorf("failed to rename environment directory: %w", err)
		}
		env.Name = *newName
		delete(configFile.Environments, envName)
		envName = *newName
	}

	if newProfile != nil {
		env.Profile = *newProfile
	}

	configFile.Environments[envName] = env
	return config.WriteConfigFile(".", configFile)
}

// RemoveEnvironment deletes an environment
func RemoveEnvironment(envName string) error {
	configFile, err := getEnvironmentConfig(envName)
	if err != nil {
		return err
	}

	envDir := getEnvironmentPath(envName)
	if err := os.RemoveAll(envDir); err != nil {
		return fmt.Errorf("failed to remove environment directory: %w", err)
	}

	delete(configFile.Environments, envName)
	return config.WriteConfigFile(".", configFile)
}

// ListEnvironments returns all environment names and profiles
func ListEnvironments() (map[string]string, error) {
	if !projectExists() {
		return nil, fmt.Errorf("project directory not found")
	}

	configFile, err := config.ReadConfigFile(".")
	if err != nil {
		return nil, err
	}

	result := make(map[string]string)
	for name, env := range configFile.Environments {
		result[name] = env.Profile
	}
	return result, nil
}

// AddFiles copies files to the environment folder
func AddFiles(envName string, paramFiles, tagFiles, gitSyncFiles []string) error {
	if !projectExists() {
		return fmt.Errorf("project directory not found")
	}

	_, err := getEnvironmentConfig(envName)
	if err != nil {
		return err
	}

	destDir := getEnvironmentPath(envName)
	return processFileGroups(destDir, paramFiles, tagFiles, gitSyncFiles)
}

func copyFiles(destDir string, srcFiles []string) error {
	for _, srcFile := range srcFiles {
		if _, err := os.Stat(srcFile); os.IsNotExist(err) {
			return fmt.Errorf("file not found: %s", srcFile)
		}

		if !validateFileType(srcFile) {
			return fmt.Errorf("unsupported file type: %s (only .json, .yaml, .yml allowed)", srcFile)
		}

		fileName := filepath.Base(srcFile)
		destFile := filepath.Join(destDir, fileName)

		if err := copyFile(srcFile, destFile); err != nil {
			return fmt.Errorf("failed to copy %s: %w", srcFile, err)
		}
	}
	return nil
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

func validateFileType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return allowedExtensions[ext]
}

func getEnvironmentPath(envName string) string {
	return filepath.Join(ProjectDir, EnvironmentsDir, envName)
}

func projectExists() bool {
	if _, err := os.Stat(ProjectDir); os.IsNotExist(err) {
		return false
	}
	_, err := os.Stat(filepath.Join(ProjectDir, ConfigFile))
	return !os.IsNotExist(err)
}

func environmentExists(envName string) bool {
	configFile, err := config.ReadConfigFile(".")
	if err != nil {
		return false
	}
	_, exists := configFile.Environments[envName]
	return exists
}

func getEnvironmentConfig(envName string) (*config.ProjectConfig, error) {
	configFile, err := config.ReadConfigFile(".")
	if err != nil {
		return nil, err
	}
	if _, exists := configFile.Environments[envName]; !exists {
		return nil, fmt.Errorf("environment '%s' not found", envName)
	}
	return configFile, nil
}

func processFileGroups(destDir string, fileGroups ...[]string) error {
	for _, files := range fileGroups {
		if err := copyFiles(destDir, files); err != nil {
			return err
		}
	}
	return nil
}
