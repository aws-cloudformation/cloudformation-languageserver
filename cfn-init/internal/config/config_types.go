package config

import "time"

// ProjectConfig represents the complete configuration for a CloudFormation project.
type ProjectConfig struct {
	Version      string                 `json:"version"`
	Project      ProjectInfo            `json:"project"`
	Environments map[string]Environment `json:"environments"`
}

// ProjectInfo contains basic metadata about the CloudFormation project.
type ProjectInfo struct {
	Name    string    `json:"name"`
	Created time.Time `json:"created"`
}

// Environment represents a deployment environment configuration.
type Environment struct {
	Name    string `json:"name"`
	Profile string `json:"profile"`
}
