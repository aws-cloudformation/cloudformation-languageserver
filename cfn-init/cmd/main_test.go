// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gopkg.in/yaml.v3"
)

func TestVersionConstant(t *testing.T) {
	assert.NotEmpty(t, version, "Version should not be empty")
	assert.Equal(t, "1.0.0", version, "Version should be 1.0.0")
}

func TestCreateCommandArgs(t *testing.T) {
	assert.NotNil(t, createCmd.Args, "Create command should have Args validation")

	// Test with no args (should fail)
	err := createCmd.Args(createCmd, []string{})
	assert.Error(t, err, "Create command should require at least one argument")

	// Test with one arg (should pass)
	err = createCmd.Args(createCmd, []string{"test-project"})
	assert.NoError(t, err, "Create command should accept one argument")
}

func TestProjectConfig(t *testing.T) {
	config := ProjectConfig{
		Name:    "test-project",
		Version: "1.0.0",
	}

	// Test YAML marshaling using testify assertions
	yamlData, err := yaml.Marshal(&config)
	assert.NoError(t, err)
	assert.Contains(t, string(yamlData), "name: test-project")
	assert.Contains(t, string(yamlData), "version: 1.0.0")

	// Test YAML unmarshaling
	var unmarshaledConfig ProjectConfig
	err = yaml.Unmarshal(yamlData, &unmarshaledConfig)
	assert.NoError(t, err)
	assert.Equal(t, "test-project", unmarshaledConfig.Name)
	assert.Equal(t, "1.0.0", unmarshaledConfig.Version)
}
