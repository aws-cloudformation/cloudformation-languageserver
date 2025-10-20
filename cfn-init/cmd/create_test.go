package main

import (
	"bufio"
	"cfn-init/internal"
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

func TestCollectInputs_WithEnvironmentsJSON(t *testing.T) {
	CreateCmd.Flags().Set("environments", `{"environments":[{"name":"dev","awsProfile":"dev-profile"}]}`)
	defer CreateCmd.Flags().Set("environments", "")

	args := []string{"test-project"}
	scanner := bufio.NewScanner(strings.NewReader(""))

	inputs, err := collectInputs(CreateCmd, args, scanner)

	assert.NoError(t, err)
	assert.Equal(t, "test-project", inputs.ProjectName)
	assert.Len(t, inputs.Environments, 1)
	assert.Equal(t, "dev", inputs.Environments[0].Name)
	assert.Equal(t, "dev-profile", inputs.Environments[0].AwsProfile)
}

func TestCollectInputs_InvalidEnvironmentsJSON(t *testing.T) {
	CreateCmd.Flags().Set("environments", `{"invalid json"}`)
	defer CreateCmd.Flags().Set("environments", "")

	args := []string{"test-project"}
	scanner := bufio.NewScanner(strings.NewReader(""))

	_, err := collectInputs(CreateCmd, args, scanner)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid JSON environments config")
}

func TestValidateInputs_WithEnvironments(t *testing.T) {
	tempDir := t.TempDir()

	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
		Environments: []internal.EnvironmentConfig{
			{Name: "dev", AwsProfile: "dev-profile"},
			{Name: "prod", AwsProfile: "prod-profile"},
		},
	}

	err := validateInputs(inputs)
	assert.NoError(t, err)
}

func TestValidateInputs_EnvironmentMissingName(t *testing.T) {
	tempDir := t.TempDir()

	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
		Environments: []internal.EnvironmentConfig{
			{Name: "", AwsProfile: "dev-profile"},
		},
	}

	err := validateInputs(inputs)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "environment name is required")
}

func TestValidateInputs_EnvironmentMissingProfile(t *testing.T) {
	tempDir := t.TempDir()

	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
		Environments: []internal.EnvironmentConfig{
			{Name: "dev", AwsProfile: ""},
		},
	}

	err := validateInputs(inputs)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "aws profile is required for environment 'dev'")
}

func TestExecuteCreate_WithEnvironments(t *testing.T) {
	tempDir := t.TempDir()

	// Create test files
	testFile := filepath.Join(tempDir, "test-params.json")
	err := os.WriteFile(testFile, []byte(`{"key": "value"}`), 0644)
	assert.NoError(t, err)

	inputs := &CreateInputs{
		ProjectName: "test-project",
		ProjectPath: tempDir,
		Environments: []internal.EnvironmentConfig{
			{
				Name:            "dev",
				AwsProfile:      "dev-profile",
				ParametersFiles: []string{testFile},
			},
			{
				Name:       "prod",
				AwsProfile: "prod-profile",
			},
		},
	}

	err = executeCreate(inputs)
	assert.NoError(t, err)

	// Verify project structure
	projectDir := filepath.Join(tempDir, "cfn-project")
	assert.DirExists(t, projectDir)
	assert.DirExists(t, filepath.Join(projectDir, "environments", "dev"))
	assert.DirExists(t, filepath.Join(projectDir, "environments", "prod"))
	assert.FileExists(t, filepath.Join(projectDir, "environments", "dev", "test-params.json"))
}

func TestParseFileList(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"file1.json", []string{"file1.json"}},
		{"file1.json,file2.yaml", []string{"file1.json", "file2.yaml"}},
		{"file1.json, file2.yaml, file3.yml", []string{"file1.json", "file2.yaml", "file3.yml"}},
		{"", []string{}},
		{" , , ", []string{}},
	}

	for _, test := range tests {
		result := parseFileList(test.input)
		assert.Equal(t, test.expected, result, "Input: %s", test.input)
	}
}
