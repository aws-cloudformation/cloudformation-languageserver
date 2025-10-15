package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const version = "1.0.0"

var rootCmd = &cobra.Command{
	Use:           "cfn-init",
	Short:         "CloudFormation project management CLI",
	Long:          "A CLI tool for bootstrapping and managing CloudFormation projects with enhanced IDE integration.",
	SilenceErrors: true,
}

func init() {
	rootCmd.AddCommand(CreateCmd)
	rootCmd.AddCommand(versionCmd)
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
