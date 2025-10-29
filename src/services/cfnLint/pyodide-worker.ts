import { parentPort } from 'worker_threads';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import { PublishDiagnosticsParams } from 'vscode-languageserver';
import { CloudFormationFileType } from '../../document/Document';

// Instead of sending stdout/stderr messages back to the main thread,
// we'll just log them in the worker thread
const customStdout = (_text: string): void => {
    // No-op in production, used for debugging
    // console.log(text);
};

const customStderr = (_text: string): void => {
    // No-op in production, used for debugging
    // console.error(text);
};

interface WorkerMessage {
    id: string;
    action: string;
    payload: Record<string, unknown>;
}

interface InitializeResult {
    status: 'initialized' | 'already-initialized' | 'already-initializing';
}

interface MountResult {
    mounted: boolean;
    mountDir: string;
}

let pyodide: PyodideInterface | undefined;
let initialized = false;
let initializing = false;

// Handle messages from main thread
if (parentPort) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    parentPort.on('message', async (message: WorkerMessage) => {
        const { id, action, payload } = message;

        try {
            let result: unknown;

            switch (action) {
                case 'initialize': {
                    result = await initializePyodide();
                    break;
                }
                case 'lint': {
                    result = await lintTemplate(
                        payload.content as string,
                        payload.uri as string,
                        payload.fileType as CloudFormationFileType,
                    );
                    break;
                }
                case 'lintFile': {
                    result = await lintFile(
                        payload.path as string,
                        payload.uri as string,
                        payload.fileType as CloudFormationFileType,
                    );
                    break;
                }
                case 'mountFolder': {
                    result = mountFolder(payload.fsDir as string, payload.mountDir as string);
                    break;
                }
                default: {
                    throw new Error(`Unknown action: ${action}`);
                }
            }

            // Send successful result back to main thread
            if (parentPort !== null && parentPort !== undefined) {
                parentPort.postMessage({ id, result, success: true });
            }
        } catch (error) {
            // Send error back to main thread
            if (parentPort !== null && parentPort !== undefined) {
                parentPort.postMessage({
                    id,
                    error: error instanceof Error ? error.message : String(error),
                    success: false,
                });
            }
        }
    });
}

// Initialize Pyodide with cfn-lint
async function initializePyodide(): Promise<InitializeResult> {
    if (initialized) {
        return { status: 'already-initialized' };
    }

    if (initializing) {
        return { status: 'already-initializing' };
    }

    initializing = true;

    try {
        // Load Pyodide with explicit stdout/stderr handlers
        pyodide = await loadPyodide({
            stdout: customStdout,
            stderr: customStderr,
        });

        if (!pyodide) {
            throw new Error('Failed to initialize Pyodide: returned null');
        }

        // Load required packages
        await pyodide.loadPackage('micropip');
        await pyodide.loadPackage('ssl');
        await pyodide.loadPackage('pyyaml');

        // Replace CSafeLoader with SafeLoader to avoid Pyodide parsing issues
        await pyodide.runPythonAsync(`
       import yaml
       if hasattr(yaml, 'CSafeLoader'):
           yaml.CSafeLoader = yaml.SafeLoader
     `);

        // Install cfn-lint
        await pyodide.runPythonAsync(`
      import micropip
      await micropip.install('cfn-lint')
    `);

        // Setup Python functions for linting
        await pyodide.runPythonAsync(`
      import json
      from cfnlint.version import __version__

      print('cfn-lint version:', __version__)
      
      import json
      from pathlib import Path
      from cfnlint import lint, lint_by_config, ManualArgs

      def match_to_diagnostics(matches, uri):
          filename_results = {}
          for match in matches:
              
              # Map severity levels to LSP DiagnosticSeverity
              severity = 1  # Default: Error
              if match.rule.severity.lower() == 'warning':
                  severity = 2
              elif match.rule.severity.lower() == 'informational':
                  severity = 3
              
              if match.filename not in filename_results:
                  filename_results[match.filename] = []
              
              filename_results[match.filename].append({
                  'severity': severity,
                  'range': {
                      'start': {
                          'line': match.linenumber - 1,
                          'character': match.columnnumber - 1,
                      },
                      'end': {
                          'line': match.linenumberend - 1,
                          'character': match.columnnumberend - 1,
                      }
                  },
                  'message': match.message,
                  'source': 'cfn-lint',
                  'code': match.rule.id,
                  'codeDescription': {
                      'href': match.rule.source_url,
                  }
              })
          
          results = []
          for filename, diagnostics in filename_results.items():
              # For single-file linting, all diagnostics should map to the original file URI
              # Multi-file scenarios (like GitSync referencing templates) should be handled
              # by separate linting sessions for each file
              results.append({
                  'uri': uri,
                  'diagnostics': diagnostics
              })
          
          return results
      
      def lint_str(template_str, uri, template_args=None):
          """
          Lint a CloudFormation template string and return LSP diagnostics
          
          Args:
              template_str (str): CloudFormation template as a string
              uri (str): Document URI
              template_args (dict, optional): Additional template arguments

          Returns:
              dict: LSP PublishDiagnosticsParams
          """

          return match_to_diagnostics(lint(template_str), uri)

      def lint_uri(lint_path, uri, lint_type, template_args=None):
          args = ManualArgs()
          path = Path(lint_path)
          if lint_type == "template":
              args["templates"] = [str(path)]
          elif lint_type == "gitsync-deployment":
              args["deployment_files"] = [str(path)]

          return match_to_diagnostics(lint_by_config(args), uri)
    `);

        // Create result object first
        const result = { status: 'initialized' as const };

        // eslint-disable-next-line require-atomic-updates
        initialized = true;
        // eslint-disable-next-line require-atomic-updates
        initializing = false;

        return result;
    } catch (error) {
        // eslint-disable-next-line require-atomic-updates
        initializing = false;
        throw error;
    }
}

function convertPythonResultToDiagnostics(result: unknown): PublishDiagnosticsParams[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if (!result || typeof (result as any).toJs !== 'function') {
        throw new Error('Invalid result from Python linting');
    }

    // Type assertion for the conversion result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const diagnostics = (result as any).toJs({
        dict_converter: Object.fromEntries,
    });

    return (Array.isArray(diagnostics) ? diagnostics : []) as PublishDiagnosticsParams[];
}

// Lint template content as string
async function lintTemplate(
    content: string,
    uri: string,
    _fileType: CloudFormationFileType,
): Promise<PublishDiagnosticsParams[]> {
    if (!initialized || !pyodide) {
        throw new Error('Pyodide not initialized');
    }

    // Safe type assertions since we know the expected types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pyUri = pyodide.toPy(uri);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pyContent = pyodide.toPy(content.replaceAll('"""', '\\"\\"\\"'));

    // Execute Python code and get result
    const pythonCode = `lint_str(r"""${pyContent}""", r"""${pyUri}""")`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await pyodide.runPythonAsync(pythonCode);

    return convertPythonResultToDiagnostics(result);
}

// Lint file using path
async function lintFile(
    path: string,
    uri: string,
    fileType: CloudFormationFileType,
): Promise<PublishDiagnosticsParams[]> {
    if (!initialized || !pyodide) {
        throw new Error('Pyodide not initialized');
    }

    // Execute Python code and get result
    const pythonCode = `lint_uri(r"""${path}""", r"""${uri}""", r"""${fileType}""")`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await pyodide.runPythonAsync(pythonCode);

    return convertPythonResultToDiagnostics(result);
}

// Mount folder to Pyodide filesystem
function mountFolder(fsDir: string, mountDir: string): MountResult {
    if (!initialized || !pyodide) {
        throw new Error('Pyodide not initialized');
    }

    try {
        pyodide.FS.mkdirTree(mountDir);

        // The first parameter should be the mount point, the second parameter should be the host path
        pyodide.mountNodeFS(mountDir, fsDir);

        return { mounted: true, mountDir };
    } catch (error) {
        // Clean up if mounting fails
        try {
            pyodide.FS.rmdir(mountDir);
        } catch {
            // Ignore cleanup errors
        }
        throw error;
    }
}
