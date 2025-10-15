package bootstrap

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInit_Success(t *testing.T) {
	tempDir := t.TempDir()

	err := Init("test-project", tempDir)

	assert.NoError(t, err)

	projectDir := filepath.Join(tempDir, "cfn-project")
	assert.DirExists(t, projectDir)

	configFile := filepath.Join(projectDir, "cfn-config.json")
	assert.FileExists(t, configFile)
}

func TestInit_DirectoryExists(t *testing.T) {
	tempDir := t.TempDir()

	// Create project first time
	err := Init("test-project", tempDir)
	assert.NoError(t, err)

	// Try to create again - should fail
	err = Init("test-project", tempDir)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestGenerateConfig(t *testing.T) {
	config := generateInitialConfig("test-project")

	assert.Equal(t, "1.0", config.Version)
	assert.Equal(t, "test-project", config.Project.Name)
	assert.NotZero(t, config.Project.Created)
	assert.NotNil(t, config.Environments)
	assert.Empty(t, config.Environments)
}
