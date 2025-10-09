package config

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWriteConfigFile(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.json")
	
	config := &ProjectConfig{
		Version: "1.0",
		Project: ProjectInfo{
			Name:    "test-project",
			Created: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		Environments: make(map[string]Environment),
	}
	
	err := WriteConfigFile(configPath, config)
	assert.NoError(t, err)
	assert.FileExists(t, configPath)
}

func TestReadConfigFile(t *testing.T) {
	tempDir := t.TempDir()
	configPath := filepath.Join(tempDir, "test-config.json")
	
	// Write a config first
	originalConfig := &ProjectConfig{
		Version: "1.0",
		Project: ProjectInfo{
			Name:    "test-project",
			Created: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		Environments: make(map[string]Environment),
	}
	
	err := WriteConfigFile(configPath, originalConfig)
	assert.NoError(t, err)
	
	// Read it back
	readConfig, err := ReadConfigFile(configPath)
	assert.NoError(t, err)
	assert.Equal(t, "1.0", readConfig.Version)
	assert.Equal(t, "test-project", readConfig.Project.Name)
	assert.NotNil(t, readConfig.Environments)
}

func TestReadConfigFile_NotFound(t *testing.T) {
	_, err := ReadConfigFile("/nonexistent/path/config.json")
	assert.Error(t, err)
}

func TestWriteConfigFile_InvalidPath(t *testing.T) {
	config := &ProjectConfig{
		Version: "1.0",
		Project: ProjectInfo{Name: "test"},
		Environments: make(map[string]Environment),
	}
	
	err := WriteConfigFile("/nonexistent/path/config.json", config)
	assert.Error(t, err)
}
