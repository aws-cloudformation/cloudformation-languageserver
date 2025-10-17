package config

import (
	"cfn-init/internal/permissions"
	"encoding/json"
	"os"
	"path/filepath"
)

// ReadConfigFile loads a project configuration from the workspace path.
func ReadConfigFile(workspacePath string) (*ProjectConfig, error) {
	configPath := filepath.Join(workspacePath, "cfn-project", "cfn-config.json")
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, err
	}

	var config ProjectConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// WriteConfigFile saves a project configuration to the workspace path.
func WriteConfigFile(workspacePath string, config *ProjectConfig) error {
	configPath := filepath.Join(workspacePath, "cfn-project", "cfn-config.json")
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, permissions.ConfigFile)
}
