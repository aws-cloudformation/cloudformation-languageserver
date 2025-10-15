package permissions

import "os"

// File and directory permissions used throughout the application
const (
	// ProjectDir defines permissions for created project directories (rwxr-xr-x)
	ProjectDir os.FileMode = 0755
	
	// ConfigFile defines permissions for created configuration files (rw-r--r--)
	ConfigFile os.FileMode = 0644
)
