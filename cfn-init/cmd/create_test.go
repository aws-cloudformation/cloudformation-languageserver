package main

import (
	"bufio"
	"cfn-init/internal/permissions"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCollectInputs_WithProjectName(t *testing.T) {
	args := []string{"test-project"}
	scanner := bufio.NewScanner(strings.NewReader(""))
	
	inputs, err := collectInputs(CreateCmd, args, scanner)
	
	assert.NoError(t, err)
	assert.Equal(t, "test-project", inputs.ProjectName)
	assert.Equal(t, ".", inputs.ProjectPath)
}

func TestCollectInputs_WithProjectNameAndPath(t *testing.T) {
	// Set the flag value
	CreateCmd.Flags().Set("project-path", "/custom/path")
	defer CreateCmd.Flags().Set("project-path", ".") // Reset after test
	
	args := []string{"test-project"}
	scanner := bufio.NewScanner(strings.NewReader(""))
	
	inputs, err := collectInputs(CreateCmd, args, scanner)
	
	assert.NoError(t, err)
	assert.Equal(t, "test-project", inputs.ProjectName)
	assert.Equal(t, "/custom/path", inputs.ProjectPath)
}

func TestCollectInputs_Interactive(t *testing.T) {
	// Reset flag state completely
	CreateCmd.Flags().Set("project-path", ".")
	CreateCmd.Flag("project-path").Changed = false
	
	args := []string{}
	input := "my-project\n/custom/path\n"
	scanner := bufio.NewScanner(strings.NewReader(input))
	
	inputs, err := collectInputs(CreateCmd, args, scanner)
	
	assert.NoError(t, err)
	assert.Equal(t, "my-project", inputs.ProjectName)
	assert.Equal(t, "/custom/path", inputs.ProjectPath)
}

func TestCollectInputs_InteractiveDefaultPath(t *testing.T) {
	// Reset flag state completely
	CreateCmd.Flags().Set("project-path", ".")
	CreateCmd.Flag("project-path").Changed = false
	
	args := []string{}
	input := "my-project\n\n" // Empty line for default path
	scanner := bufio.NewScanner(strings.NewReader(input))
	
	inputs, err := collectInputs(CreateCmd, args, scanner)
	
	assert.NoError(t, err)
	assert.Equal(t, "my-project", inputs.ProjectName)
	assert.Equal(t, ".", inputs.ProjectPath)
}

func TestValidateInputs_Success(t *testing.T) {
	tempDir := t.TempDir()
	
	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
	}
	
	err := validateInputs(inputs)
	assert.NoError(t, err)
}

func TestValidateInputs_EmptyProjectName(t *testing.T) {
	inputs := &CreateInputs{
		ProjectName: "",
		ProjectPath: ".",
	}
	
	err := validateInputs(inputs)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "project name is required")
}

func TestValidateInputs_DirectoryExists(t *testing.T) {
	tempDir := t.TempDir()
	projectDir := filepath.Join(tempDir, "cfn-project")
	os.MkdirAll(projectDir, permissions.ProjectDir)
	
	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
	}
	
	err := validateInputs(inputs)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "already exists")
}

func TestExecuteCreate_Success(t *testing.T) {
	tempDir := t.TempDir()
	
	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
	}
	
	err := executeCreate(inputs)
	assert.NoError(t, err)
	
	// Verify project was created
	projectDir := filepath.Join(tempDir, "cfn-project")
	assert.DirExists(t, projectDir)
	
	configFile := filepath.Join(projectDir, "cfn-config.json")
	assert.FileExists(t, configFile)
}
