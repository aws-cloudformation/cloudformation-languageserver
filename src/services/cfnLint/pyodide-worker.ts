import path from 'path';
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
    installSource?: string;
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
                        payload.settings as Record<string, unknown>,
                    );
                    break;
                }
                case 'lintFile': {
                    result = await lintFile(
                        payload.path as string,
                        payload.uri as string,
                        payload.fileType as CloudFormationFileType,
                        payload.settings as Record<string, unknown>,
                    );
                    break;
                }
                case 'mountFolder': {
                    result = mountFolder(payload.fsDir as string, payload.mountDir as string);
                    break;
                }
                case 'getVersion': {
                    result = await getVersion();
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

        // Load additional packages that cfn-lint needs
        await pyodide.loadPackage('regex');
        await pyodide.loadPackage('rpds-py');
        await pyodide.loadPackage('pydantic');
        await pyodide.loadPackage('pydantic-core');

        // Replace CSafeLoader with SafeLoader to avoid Pyodide parsing issues
        await pyodide.runPythonAsync(`
       import yaml
       if hasattr(yaml, 'CSafeLoader'):
           yaml.CSafeLoader = yaml.SafeLoader
     `);

        // Mount assets directory to access local wheels
        const assetsPath = path.join(__dirname, 'assets');
        try {
            pyodide.FS.mkdirTree('/assets');
            pyodide.mountNodeFS('/assets', assetsPath);
        } catch {
            // Failed to mount assets directory
        }

        // Install cfn-lint with local wheel fallback
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const installResult = await pyodide.runPythonAsync(`
      import micropip
      import os
      from pathlib import Path
      
      cfn_lint_installed = False
      install_source = None
      
      # Debug: Check current working directory and available paths
      print(f'Current working directory: {os.getcwd()}')
      print(f'Directory contents: {os.listdir(".")}')
      
      # Try to install latest from PyPI first
      try:
          await micropip.install('cfn-lint')
          cfn_lint_installed = True
          install_source = 'pypi'
          print('Installed cfn-lint from PyPI')
      except Exception as e:
          print(f'Failed to install cfn-lint from PyPI: {e}')
      
      # Fallback to local wheels if online installation failed
      if not cfn_lint_installed:
          wheels_dir = Path('/assets/wheels')
          print(f'Checking for wheels in: {wheels_dir}')
          
          if wheels_dir.exists():
              wheel_files = list(wheels_dir.glob('*.whl'))
              print(f'Found {len(wheel_files)} wheel files')
              
              if wheel_files:
                  try:
                      # Install all wheels using emfs:// URLs with no-deps to avoid online dependency resolution
                      for wheel_file in wheel_files:
                          wheel_url = f'emfs:{wheel_file}'
                          print(f'Installing: {wheel_file.name}')
                          await micropip.install(wheel_url, deps=False)
                      cfn_lint_installed = True
                      install_source = 'wheels'
                      print(f'Installed cfn-lint and dependencies from local wheels ({len(wheel_files)} packages)')
                  except Exception as e:
                      print(f'Failed to install from local wheels: {e}')
              else:
                  print('No wheel files found in wheels directory')
          else:
              print(f'Wheels directory not found: {wheels_dir}')
          
          if not cfn_lint_installed:
              raise Exception('Failed to install cfn-lint from both PyPI and local wheels')
      
      install_source
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
      
      def parse_cfn_lint_settings(settings):
          """Parse cfn-lint settings into ManualArgs format"""
          config = {}
          if not settings:
              return config
              
          if settings.get('ignoreChecks'):
              config['ignore_checks'] = settings['ignoreChecks']
          if settings.get('includeChecks'):
              config['include_checks'] = settings['includeChecks']
          if settings.get('mandatoryChecks'):
              config['mandatory_checks'] = settings['mandatoryChecks']
          if settings.get('includeExperimental'):
              config['include_experimental'] = settings['includeExperimental']
          if settings.get('configureRules'):
              # Parse configure rules from string format "RuleId:key=value"
              configure_rules = {}
              for rule_config in settings['configureRules']:
                  if ':' in rule_config:
                      rule_id, config_str = rule_config.split(':', 1)
                      if '=' in config_str:
                          key, value = config_str.split('=', 1)
                          if rule_id not in configure_rules:
                              configure_rules[rule_id] = {}
                          # Convert string values to appropriate types
                          if value.lower() == 'true':
                              configure_rules[rule_id][key] = True
                          elif value.lower() == 'false':
                              configure_rules[rule_id][key] = False
                          else:
                              try:
                                  configure_rules[rule_id][key] = int(value)
                              except ValueError:
                                  configure_rules[rule_id][key] = value
              if configure_rules:
                  config['configure_rules'] = configure_rules
          if settings.get('regions'):
              config['regions'] = settings['regions']
          return config

      def lint_str(template_str, uri, settings=None):
          """
          Lint a CloudFormation template string and return LSP diagnostics
          
          Args:
              template_str (str): CloudFormation template as a string
              uri (str): Document URI
              settings (dict, optional): cfn-lint settings

          Returns:
              dict: LSP PublishDiagnosticsParams
          """
          config = parse_cfn_lint_settings(settings)
          return match_to_diagnostics(lint(template_str, config=ManualArgs(**config) if config else None), uri)

      def lint_uri(lint_path, uri, lint_type, settings=None):
          config = parse_cfn_lint_settings(settings)
          path = Path(lint_path)
          
          if lint_type == "template":
              config["templates"] = [str(path)]
          elif lint_type == "gitsync-deployment":
              config["deployment_files"] = [str(path)]

          return match_to_diagnostics(lint_by_config(ManualArgs(**config)), uri)
    `);

        // Create result object with installation source
        const result = { status: 'initialized' as const, installSource: installResult as string };

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

async function getVersion(): Promise<string> {
    if (!pyodide) {
        throw new Error('Pyodide not initialized');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await pyodide.runPythonAsync(`
        from cfnlint.version import __version__
        __version__
    `);

    return result as string;
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
    settings?: Record<string, unknown>,
): Promise<PublishDiagnosticsParams[]> {
    if (!initialized || !pyodide) {
        throw new Error('Pyodide not initialized');
    }

    // Safe type assertions since we know the expected types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pyUri = pyodide.toPy(uri);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pyContent = pyodide.toPy(content.replaceAll('"""', '\\"\\"\\"'));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pySettings = pyodide.toPy(settings ?? {});

    // Execute Python code and get result
    const pythonCode = `lint_str(r"""${pyContent}""", r"""${pyUri}""", ${pySettings})`;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await pyodide.runPythonAsync(pythonCode);

    return convertPythonResultToDiagnostics(result);
}

// Lint file using path
async function lintFile(
    path: string,
    uri: string,
    fileType: CloudFormationFileType,
    settings?: Record<string, unknown>,
): Promise<PublishDiagnosticsParams[]> {
    if (!initialized || !pyodide) {
        throw new Error('Pyodide not initialized');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pySettings = pyodide.toPy(settings ?? {});

    // Execute Python code and get result
    const pythonCode = `lint_uri(r"""${path}""", r"""${uri}""", r"""${fileType}""", ${pySettings})`;
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
