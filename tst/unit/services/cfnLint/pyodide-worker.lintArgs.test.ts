/**
 * Verifies that the cfn-lint Pyodide worker invokes the lint_str / lint_uri
 * Python entrypoints with the template content, uri, path and fileType passed
 * as native arguments, rather than building a Python source string from them.
 *
 * Covers inputs that contain triple-quote and percent-encoded quote sequences:
 * these must be passed through verbatim and must not change how the call is made.
 */
import { loadPyodide } from 'pyodide';
import { describe, expect, beforeAll, beforeEach, vi, test, Mock } from 'vitest';

const hoisted = vi.hoisted(() => ({
    handlerRef: { current: undefined as undefined | ((m: unknown) => Promise<void>) },
    postMessage: vi.fn(),
}));

vi.mock('worker_threads', () => ({
    parentPort: {
        on: (event: string, cb: (m: unknown) => Promise<void>) => {
            if (event === 'message') {
                hoisted.handlerRef.current = cb;
            }
        },
        postMessage: hoisted.postMessage,
    },
}));

vi.mock('pyodide', () => ({ loadPyodide: vi.fn() }));
vi.mock('fs', () => ({ readFileSync: vi.fn(), existsSync: vi.fn() }));

// A callable Python handle stand-in: a spy that also carries a destroy() method.
const makeCallable = (ret: string) => {
    const fn = vi.fn(() => ret) as unknown as Mock & { destroy: Mock };
    fn.destroy = vi.fn();
    return fn;
};

type MockPyodide = ReturnType<typeof createMockPyodide>;
let current: MockPyodide;

const createMockPyodide = () => {
    const lintStr = makeCallable('[]');
    const lintUri = makeCallable('[]');
    const other = makeCallable('[]');
    const obj = {
        lintStr,
        lintUri,
        loadPackage: vi.fn().mockResolvedValue(undefined),
        runPythonAsync: vi.fn().mockResolvedValue('initialized'),
        toPy: vi.fn(() => ({ destroy: vi.fn() })),
        globals: {
            get: vi.fn((name: string) => (name === 'lint_str' ? lintStr : name === 'lint_uri' ? lintUri : other)),
        },
        FS: { mkdirTree: vi.fn(), rmdir: vi.fn(), unlink: vi.fn(), writeFile: vi.fn(), readFile: vi.fn() },
        mountNodeFS: vi.fn(),
        unpackArchive: vi.fn(),
    };
    current = obj;
    return obj;
};

const handler = () => {
    if (!hoisted.handlerRef.current) {
        throw new Error('worker did not register a message handler');
    }
    return hoisted.handlerRef.current;
};

describe('pyodide-worker lint arguments', () => {
    beforeAll(async () => {
        (loadPyodide as Mock).mockImplementation(() => Promise.resolve(createMockPyodide()));
        await import('../../../../src/services/cfnLint/pyodide-worker');
        await handler()({ id: 1, action: 'initialize', payload: {} });
    });

    beforeEach(() => {
        current.lintStr.mockClear();
        current.lintStr.destroy.mockClear();
        current.lintUri.mockClear();
        current.lintUri.destroy.mockClear();
        current.globals.get.mockClear();
        current.runPythonAsync.mockClear();
        hoisted.postMessage.mockClear();
    });

    test('passes content and uri to lint_str as native arguments', async () => {
        const contentWithQuotes = 'Resources:\n  Bucket:\n    Type: "AWS::S3::Bucket"\n    Metadata: """x"""\n';
        const uriWithEncodedQuotes = 'file:///tmp/a%22%22%22b.yaml';

        await handler()({
            id: 2,
            action: 'lint',
            payload: { content: contentWithQuotes, uri: uriWithEncodedQuotes, fileType: 'template', settings: {} },
        });

        expect(current.globals.get).toHaveBeenCalledWith('lint_str');
        expect(current.lintStr).toHaveBeenCalledTimes(1);
        // Values are passed through verbatim as arguments.
        expect(current.lintStr.mock.calls[0][0]).toBe(contentWithQuotes);
        expect(current.lintStr.mock.calls[0][1]).toBe(uriWithEncodedQuotes);
        // No Python source string is built or run for a lint.
        expect(current.runPythonAsync).not.toHaveBeenCalled();
        // The Python handle is released.
        expect(current.lintStr.destroy).toHaveBeenCalledTimes(1);
        const last = hoisted.postMessage.mock.calls.at(-1)?.[0] as { success: boolean };
        expect(last.success).toBe(true);
    });

    test('passes path, uri and fileType to lint_uri as native arguments', async () => {
        const pathWithQuotes = '/tmp/weird"""name.yaml';
        const uri = 'file:///tmp/weird.yaml';

        await handler()({
            id: 3,
            action: 'lintFile',
            payload: { path: pathWithQuotes, uri, fileType: 'template', settings: {} },
        });

        expect(current.globals.get).toHaveBeenCalledWith('lint_uri');
        expect(current.lintUri).toHaveBeenCalledTimes(1);
        expect(current.lintUri.mock.calls[0][0]).toBe(pathWithQuotes);
        expect(current.lintUri.mock.calls[0][1]).toBe(uri);
        expect(current.lintUri.mock.calls[0][2]).toBe('template');
        expect(current.runPythonAsync).not.toHaveBeenCalled();
        expect(current.lintUri.destroy).toHaveBeenCalledTimes(1);
    });
});
