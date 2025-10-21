package environment

import (
	"os"
	"path/filepath"
	"testing"

	"cfn-init/internal/bootstrap"

	"github.com/stretchr/testify/assert"
)

func setupTestProject(t *testing.T) string {
	tempDir := t.TempDir()
	err := bootstrap.Init("test-project", tempDir)
	assert.NoError(t, err)

	// Change to temp directory (parent of cfn-project) for environment operations
	originalDir, _ := os.Getwd()
	err = os.Chdir(tempDir)
	assert.NoError(t, err)

	t.Cleanup(func() {
		os.Chdir(originalDir)
	})

	return filepath.Join(tempDir, "cfn-project")
}

func TestAdd_Success(t *testing.T) {
	projectDir := setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")

	assert.NoError(t, err)
	assert.DirExists(t, filepath.Join(projectDir, "environments", "dev"))
}

func TestAdd_ProjectNotFound(t *testing.T) {
	tempDir := t.TempDir()
	originalDir, _ := os.Getwd()
	t.Cleanup(func() { os.Chdir(originalDir) })

	err := os.Chdir(tempDir)
	assert.NoError(t, err)

	err = addEnvironment("dev", "my-dev-profile")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "project directory not found")
}

func TestAdd_ConfigFileNotFound(t *testing.T) {
	tempDir := t.TempDir()
	originalDir, _ := os.Getwd()
	t.Cleanup(func() { os.Chdir(originalDir) })

	err := os.Chdir(tempDir)
	assert.NoError(t, err)

	// Create cfn-project directory but no config file
	err = os.MkdirAll("cfn-project", 0755)
	assert.NoError(t, err)

	err = addEnvironment("dev", "my-dev-profile")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "project directory not found")
}

func TestAdd_EnvironmentExists(t *testing.T) {
	setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	err = addEnvironment("dev", "another-profile")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestUpdate_Success(t *testing.T) {
	projectDir := setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	newName := "development"
	newProfile := "new-profile"
	err = UpdateEnvironment("dev", &newName, &newProfile)

	assert.NoError(t, err)
	assert.DirExists(t, filepath.Join(projectDir, "environments", "development"))
	assert.NoDirExists(t, filepath.Join(projectDir, "environments", "dev"))
}

func TestUpdate_EnvironmentNotFound(t *testing.T) {
	setupTestProject(t)

	newName := "development"
	err := UpdateEnvironment("nonexistent", &newName, nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

func TestRemove_Success(t *testing.T) {
	projectDir := setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	err = RemoveEnvironment("dev")

	assert.NoError(t, err)
	assert.NoDirExists(t, filepath.Join(projectDir, "environments", "dev"))
}

func TestAddFiles_Success(t *testing.T) {
	projectDir := setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	// Create test file in temp directory (not inside cfn-project)
	tempDir := filepath.Dir(projectDir)
	testFile := filepath.Join(tempDir, "test-params.json")
	err = os.WriteFile(testFile, []byte(`{"key": "value"}`), 0644)
	assert.NoError(t, err)

	err = AddFiles("dev", []string{testFile}, nil, nil)

	assert.NoError(t, err)
	assert.FileExists(t, filepath.Join(projectDir, "environments", "dev", "test-params.json"))
}

func TestAddFiles_FileNotFound(t *testing.T) {
	setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	err = AddFiles("dev", []string{"nonexistent.json"}, nil, nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "file not found")
}

func TestAddFiles_InvalidFileType(t *testing.T) {
	projectDir := setupTestProject(t)

	err := addEnvironment("dev", "my-dev-profile")
	assert.NoError(t, err)

	// Create test file with invalid extension in temp directory
	tempDir := filepath.Dir(projectDir)
	testFile := filepath.Join(tempDir, "test.txt")
	err = os.WriteFile(testFile, []byte("content"), 0644)
	assert.NoError(t, err)

	err = AddFiles("dev", []string{testFile}, nil, nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unsupported file type")
}

func TestValidateFileType(t *testing.T) {
	assert.True(t, validateFileType("test.json"))
	assert.True(t, validateFileType("test.yaml"))
	assert.True(t, validateFileType("test.yml"))
	assert.False(t, validateFileType("test.txt"))
	assert.False(t, validateFileType("test"))
}
