package internal

// EnvironmentConfig represents a single environment configuration
type EnvironmentConfig struct {
	Name            string   `json:"name"`
	AwsProfile      string   `json:"awsProfile"`
	ParametersFiles []string `json:"parametersFiles,omitempty"`
	TagsFiles       []string `json:"tagsFiles,omitempty"`
	GitSyncFiles    []string `json:"gitSyncFiles,omitempty"`
}
