package config

import (
	"encoding/json"
	"os"
)

// ReadConfigFile loads a project configuration from the specified file path.
func ReadConfigFile(path string) (*ProjectConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var config ProjectConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

// WriteConfigFile saves a project configuration to the specified file path.
func WriteConfigFile(path string, config *ProjectConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
