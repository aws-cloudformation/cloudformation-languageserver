package config

import (
	"cfn-init/internal/permissions"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestWriteConfigFile(t *testing.T) {
	tempDir := t.TempDir()

	// Create cfn-project directory
	err := os.MkdirAll(filepath.Join(tempDir, "cfn-project"), permissions.ProjectDir)
	assert.NoError(t, err)

	config := &ProjectConfig{
		Version: "1.0",
		Project: ProjectInfo{
			Name:    "test-project",
			Created: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		Environments: make(map[string]Environment),
	}

	err = WriteConfigFile(tempDir, config)
	assert.NoError(t, err)
	assert.FileExists(t, filepath.Join(tempDir, "cfn-project", "cfn-config.json"))
}

func TestReadConfigFile(t *testing.T) {
	tempDir := t.TempDir()

	// Create cfn-project directory
	err := os.MkdirAll(filepath.Join(tempDir, "cfn-project"), permissions.ProjectDir)
	assert.NoError(t, err)

	// Write a config first
	originalConfig := &ProjectConfig{
		Version: "1.0",
		Project: ProjectInfo{
			Name:    "test-project",
			Created: time.Date(2023, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		Environments: make(map[string]Environment),
	}

	err = WriteConfigFile(tempDir, originalConfig)
	assert.NoError(t, err)

	// Read it back
	readConfig, err := ReadConfigFile(tempDir)
	assert.NoError(t, err)
	assert.Equal(t, "1.0", readConfig.Version)
	assert.Equal(t, "test-project", readConfig.Project.Name)
	assert.NotNil(t, readConfig.Environments)
}

func TestReadConfigFile_NotFound(t *testing.T) {
	_, err := ReadConfigFile("/nonexistent/path")
	assert.Error(t, err)
}

func TestWriteConfigFile_InvalidPath(t *testing.T) {
	config := &ProjectConfig{
		Version:      "1.0",
		Project:      ProjectInfo{Name: "test"},
		Environments: make(map[string]Environment),
	}

	err := WriteConfigFile("/nonexistent/path", config)
	assert.Error(t, err)
}
