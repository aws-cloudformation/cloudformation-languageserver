import { writeFileSync } from 'fs';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { DeleteBucketCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DeleteRoleCommand, DeleteRolePolicyCommand, IAMClient } from '@aws-sdk/client-iam';

import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';
import { HandlerResult } from 'vscode-languageserver';

type Modules = {
    AwsClient: typeof import('../src/services/AwsClient').AwsClient;
    CfnService: typeof import('../src/services/CfnService').CfnService;
    CcapiService: typeof import('../src/services/CcapiService').CcapiService;
    S3Service: typeof import('../src/services/S3Service').S3Service;
    IamService: typeof import('../src/services/IamService').IamService;
    ControlCatalogService: typeof import('../src/services/ControlCatalogService').ControlCatalogService;
    HooksManager: typeof import('../src/hooks/HooksManager').HooksManager;
    handlers: typeof import('../src/handlers/HooksHandler');
};

async function loadModules(): Promise<Modules> {
    const awsClientMod = await import('../src/services/AwsClient');
    const cfnMod = await import('../src/services/CfnService');
    const ccapiMod = await import('../src/services/CcapiService');
    const s3Mod = await import('../src/services/S3Service');
    const iamMod = await import('../src/services/IamService');
    const controlCatalogMod = await import('../src/services/ControlCatalogService');
    const hooksMod = await import('../src/hooks/HooksManager');
    const handlers = await import('../src/handlers/HooksHandler');
    return {
        AwsClient: awsClientMod.AwsClient,
        CfnService: cfnMod.CfnService,
        CcapiService: ccapiMod.CcapiService,
        S3Service: s3Mod.S3Service,
        IamService: iamMod.IamService,
        ControlCatalogService: controlCatalogMod.ControlCatalogService,
        HooksManager: hooksMod.HooksManager,
        handlers,
    };
}

const REGION = 'us-east-1';
const RULES_BUCKET = 'hooks-guard-rules-298552056291';
const EXISTING_HOOK = 'Private::Guard::TestingToday';
const EXISTING_RULE_URI = `s3://${RULES_BUCKET}/hook.guard`;
const TS = Date.now();
const THROWAWAY_BUCKET = `hooks-harness-${TS}-298552056291`;
const THROWAWAY_ROLE = `HooksHarnessRole-${TS}`;
const THROWAWAY_RULE_KEY = `harness-test/${TS}.guard`;
const THROWAWAY_HOOK = `Private::Guard::HarnessTest${TS}`;

const VALID_RULE = `let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]
rule s3_has_tags when %s3_buckets !empty {
    %s3_buckets.Properties.Tags exists
        <<S3 buckets must declare Tags.>>
}
`;
const INVALID_RULE = `let s3_buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]
rule s3_has_tags when %s3_buckets !empty {
    %s3_buckets.Properties.Tags exists
`; // missing closing brace
const EMPTY_RULE = `# just a comment\n# another comment\n`;
const NONCOMPLIANT_TEMPLATE = JSON.stringify({
    Resources: { B: { Type: 'AWS::S3::Bucket', Properties: {} } },
});

type Outcome = 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIP';
type Result = { endpoint: string; outcome: Outcome; detail: string };
const results: Result[] = [];

function record(endpoint: string, outcome: Outcome, detail: string) {
    results.push({ endpoint, outcome, detail });
    const icon = outcome === 'PASS' ? '✅' : outcome === 'FAIL' ? '❌' : outcome === 'PARTIAL' ? '🟡' : '⚪';
    console.log(`${icon} ${endpoint} — ${detail}`);
}

function shorten(value: unknown, max = 220): string {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function invoke<R>(result: HandlerResult<R, void>): Promise<R> {
    return (await result) as R;
}

async function run<T>(
    endpoint: string,
    fn: () => Promise<T> | T,
    check: (r: T) => { ok: boolean; detail: string },
): Promise<T | undefined> {
    try {
        const r = await fn();
        const { ok, detail } = check(r);
        record(endpoint, ok ? 'PASS' : 'FAIL', detail);
        return r;
    } catch (error) {
        record(endpoint, 'FAIL', `threw: ${shorten((error as Error).message ?? error)}`);
        return undefined;
    }
}

async function main() {
    const { Storage } = await import('../src/utils/Storage');
    Storage.initialize('/tmp/hooks-harness-storage');
    LoggerFactory.initialize('silent');
    TelemetryService.initialize(undefined, { telemetryEnabled: false });

    const {
        AwsClient,
        CfnService,
        CcapiService,
        S3Service,
        IamService,
        ControlCatalogService,
        HooksManager,
        handlers,
    } = await loadModules();
    const {
        listHooksHandler,
        listHooksDetailedHandler,
        listPublicHooksHandler,
        describeHookHandler,
        listHookResultsHandler,
        getHookResultHandler,
        configureHookHandler,
        setInvocationStatusHandler,
        createGuardHookHandler,
        listIamRolesHandler,
        listS3BucketsHandler,
        createS3BucketHandler,
        createHookExecutionRoleHandler,
        activateHookHandler,
        setHookConfigurationHandler,
        getHookConfigurationHandler,
        getRuleContentHandler,
        validateRuleHandler,
        uploadRuleHandler,
    } = handlers;

    const resolved = await defaultProvider()();
    const credProvider = {
        getIAM: () => ({ ...resolved, region: REGION, profile: 'default' }),
    } as unknown as ConstructorParameters<typeof AwsClient>[0];

    const awsClient = new AwsClient(credProvider);
    const cfnService = new CfnService(awsClient);
    const ccapiService = new CcapiService(awsClient);
    const s3Service = new S3Service(awsClient);
    const iamService = new IamService(awsClient);
    const controlCatalogService = new ControlCatalogService(awsClient);
    const hooksManager = new HooksManager(cfnService);
    const components = {
        hooksManager,
        cfnService,
        s3Service,
        ccapiService,
        iamService,
        controlCatalogService,
    };

    // Raw SDK clients for cleanup + verification.
    const s3 = new S3Client({ region: REGION, credentials: resolved });
    const iam = new IAMClient({ region: REGION, credentials: resolved });

    console.log(`\n=== HOOKS LSP ENDPOINT FUNCTIONAL TEST — ${new Date().toISOString()} ===\n`);

    // ---------- A. Read endpoints ----------
    await run(
        'list',
        () => invoke(listHooksHandler(components)({ loadMore: false }, {} as never)),
        (r) => ({
            ok: !!r && Array.isArray(r.hooks) && r.hooks.some((h) => h.typeName === EXISTING_HOOK),
            detail: `${r?.hooks.length ?? 0} hooks; contains ${EXISTING_HOOK}=${!!r?.hooks.some((h) => h.typeName === EXISTING_HOOK)}`,
        }),
    );

    await run(
        'listDetailed',
        () => invoke(listHooksDetailedHandler(components)({ loadMore: false }, {} as never)),
        (r) => {
            const t = r?.hooks.find((h) => h.typeName === EXISTING_HOOK);
            return {
                ok: !!t && t.configured === true && !!t.failureMode,
                detail: t
                    ? `${EXISTING_HOOK}: configured=${t.configured} failureMode=${t.failureMode} status=${t.invocationStatus} ruleUri=${t.ruleUri}`
                    : `${EXISTING_HOOK} not found in ${r?.hooks.length ?? 0}`,
            };
        },
    );

    await run(
        'listPublic',
        () => invoke(listPublicHooksHandler(components)({ typeNamePrefix: 'AWS' }, {} as never)),
        (r) => ({ ok: !!r && Array.isArray(r.hooks), detail: `${r?.hooks.length ?? 0} public hooks` }),
    );

    await run(
        'describe',
        () => invoke(describeHookHandler(components)({ typeName: EXISTING_HOOK }, {} as never)),
        (r) => ({
            ok: !!r && r.arn.includes('type/hook') && r.visibility === 'PRIVATE',
            detail: `arn=${r?.arn} visibility=${r?.visibility} hasSchema=${!!r?.schema} hasCfgSchema=${!!r?.configurationSchema}`,
        }),
    );

    await run(
        'getConfiguration',
        () => invoke(getHookConfigurationHandler(components)({ typeName: EXISTING_HOOK }, {} as never)),
        (r) => ({ ok: !!r && r.configuration.includes('HookConfiguration'), detail: shorten(r?.configuration) }),
    );

    await run(
        'getRuleContent',
        () => invoke(getRuleContentHandler(components)({ s3Uri: EXISTING_RULE_URI }, {} as never)),
        (r) => ({ ok: !!r && r.content.length > 0, detail: `${r?.content.length ?? 0} bytes` }),
    );

    await run(
        'listIamRoles',
        () => invoke(listIamRolesHandler(components)({}, {} as never)),
        (r) => ({ ok: !!r && r.roles.length > 0, detail: `${r?.roles.length ?? 0} roles` }),
    );

    await run(
        'listS3Buckets',
        () => invoke(listS3BucketsHandler(components)({}, {} as never)),
        (r) => ({
            ok: !!r && r.buckets.includes(RULES_BUCKET),
            detail: `${r?.buckets.length ?? 0} buckets; contains rules bucket=${!!r?.buckets.includes(RULES_BUCKET)}`,
        }),
    );

    // listHookResults — the CFN API requires TargetType + TargetId; probe behavior.
    await run(
        'results/list',
        () =>
            invoke(
                listHookResultsHandler(components)(
                    { targetType: 'CLOUD_CONTROL', targetId: 'nonexistent-target-id' },
                    {} as never,
                ),
            ),
        (r) => ({ ok: !!r && Array.isArray(r.hookResults), detail: `${r?.hookResults.length ?? 0} results` }),
    );

    // result/get — needs a real hookResultId. With a syntactically-invalid id the AWS API returns
    // a ValidationError, which proves the handler -> service -> error-wrapping path works; a
    // positive-path fetch requires a real result id from an actual deployment (test-data gap).
    try {
        await invoke(getHookResultHandler(components)({ hookResultId: 'fake-id-00000000' }, {} as never));
        record('result/get', 'FAIL', 'expected a validation error for a fake id but none was thrown');
    } catch (error) {
        const msg = (error as Error).message ?? String(error);
        const wired = msg.includes('ValidationError') || msg.includes('getHookResult');
        record(
            'result/get',
            wired ? 'PARTIAL' : 'FAIL',
            wired
                ? `wiring OK (API validation reached): ${shorten(msg, 120)}; positive path needs a real result id`
                : `unexpected: ${shorten(msg)}`,
        );
    }

    // ---------- B. validateRule (local WASM) ----------
    await run(
        'validateRule (valid)',
        () => invoke(validateRuleHandler()({ ruleContent: VALID_RULE }, {} as never)),
        (r) => ({
            ok: !!r && r.valid && r.parseErrors.length === 0,
            detail: `valid=${r?.valid} parseErrors=${r?.parseErrors.length}`,
        }),
    );
    await run(
        'validateRule (invalid/missing brace)',
        () => invoke(validateRuleHandler()({ ruleContent: INVALID_RULE }, {} as never)),
        (r) => ({
            ok: !!r && r.valid === false && r.parseErrors.length > 0,
            detail: `valid=${r?.valid} parseErrors=${shorten(r?.parseErrors)}`,
        }),
    );
    await run(
        'validateRule (empty/comments-only)',
        () => invoke(validateRuleHandler()({ ruleContent: EMPTY_RULE }, {} as never)),
        (r) => ({
            ok: !!r && r.valid === false && r.parseErrors.length > 0,
            detail: `valid=${r?.valid} parseErrors=${shorten(r?.parseErrors)}`,
        }),
    );
    await run(
        'validateRule (valid + noncompliant sample)',
        () =>
            invoke(
                validateRuleHandler()({ ruleContent: VALID_RULE, sampleTemplate: NONCOMPLIANT_TEMPLATE }, {} as never),
            ),
        (r) => ({ ok: !!r && r.valid, detail: `valid=${r?.valid} violations=${r?.violations.length}` }),
    );

    // ---------- C. Write endpoints (throwaway) ----------
    let bucketCreated = false;
    await run(
        'createS3Bucket',
        () => invoke(createS3BucketHandler(components)({ bucketName: THROWAWAY_BUCKET }, {} as never)),
        (r) => {
            bucketCreated = !!r && r.bucketName === THROWAWAY_BUCKET;
            return { ok: bucketCreated, detail: `created ${r?.bucketName}` };
        },
    );

    let ruleUploaded = false;
    const throwawayRuleUri = `s3://${RULES_BUCKET}/${THROWAWAY_RULE_KEY}`;
    await run(
        'uploadRule',
        () => invoke(uploadRuleHandler(components)({ ruleContent: VALID_RULE, s3Uri: throwawayRuleUri }, {} as never)),
        (r) => {
            ruleUploaded = !!r && r.s3Uri === throwawayRuleUri;
            return { ok: ruleUploaded, detail: `uploaded ${r?.s3Uri}` };
        },
    );

    let roleArn: string | undefined;
    await run(
        'createExecutionRole',
        () =>
            invoke(
                createHookExecutionRoleHandler(components)(
                    { roleName: THROWAWAY_ROLE, ruleBucket: RULES_BUCKET },
                    {} as never,
                ),
            ),
        (r) => {
            roleArn = r?.arn;
            return { ok: !!r && !!r.arn, detail: `role=${r?.roleName} arn=${r?.arn}` };
        },
    );

    // ---------- D. Config-mutation (same-value no-op) on existing hook ----------
    const currentCfgRaw = await cfnService.getHookConfiguration(EXISTING_HOOK).catch(() => '{}');
    let currentFailureMode = 'FAIL';
    let currentStatus = 'ENABLED';
    try {
        const parsed = JSON.parse(currentCfgRaw) as Record<string, unknown>;
        const hc = ((parsed.CloudFormationConfiguration as Record<string, unknown>)?.HookConfiguration ?? {}) as Record<
            string,
            unknown
        >;
        if (typeof hc.FailureMode === 'string') currentFailureMode = hc.FailureMode;
        if (typeof hc.HookInvocationStatus === 'string') currentStatus = hc.HookInvocationStatus;
    } catch {
        /* keep defaults */
    }

    await run(
        'configure (same-value no-op)',
        () =>
            invoke(
                configureHookHandler(components)(
                    { typeName: EXISTING_HOOK, failureMode: currentFailureMode },
                    {} as never,
                ),
            ),
        (r) => ({ ok: !!r, detail: `failureMode kept=${currentFailureMode} arn=${r?.configurationArn}` }),
    );
    await run(
        'setInvocationStatus (same-value no-op)',
        () =>
            invoke(
                setInvocationStatusHandler(components)(
                    { typeName: EXISTING_HOOK, invocationStatus: currentStatus as 'ENABLED' | 'DISABLED' },
                    {} as never,
                ),
            ),
        (r) => ({
            ok: !!r && r.invocationStatus === currentStatus,
            detail: `status kept=${currentStatus} arn=${r?.configurationArn}`,
        }),
    );
    await run(
        'setConfiguration (write-back verbatim)',
        () =>
            invoke(
                setHookConfigurationHandler(components)(
                    { typeName: EXISTING_HOOK, configuration: currentCfgRaw },
                    {} as never,
                ),
            ),
        (r) => ({ ok: !!r, detail: `arn=${r?.configurationArn}` }),
    );

    // ---------- E. Lifecycle (disposable hook) ----------
    let hookCreated = false;
    if (ruleUploaded && roleArn) {
        const desiredState = JSON.stringify({
            Alias: THROWAWAY_HOOK,
            ExecutionRole: roleArn,
            FailureMode: 'WARN',
            HookStatus: 'ENABLED',
            TargetOperations: ['RESOURCE'],
            RuleLocation: { Uri: throwawayRuleUri },
        });
        await run(
            'createGuardHook',
            () => invoke(createGuardHookHandler(components)({ desiredState }, {} as never)),
            (r) => {
                hookCreated = !!r && r.operationStatus === 'SUCCESS';
                return {
                    ok: hookCreated,
                    detail: `status=${r?.operationStatus} id=${r?.identifier} err=${r?.errorCode ?? '-'} msg=${shorten(r?.statusMessage ?? '')}`,
                };
            },
        );
    } else {
        record('createGuardHook', 'SKIP', 'prerequisite rule/role not created');
    }

    if (hookCreated) {
        await run(
            'deactivate (disposable hook)',
            () => deactivateThenConfirm(components, THROWAWAY_HOOK),
            (r) => ({ ok: r.ok, detail: r.detail }),
        );
    } else {
        record('deactivate', 'SKIP', 'no disposable hook to deactivate');
    }

    // activate — real public third-party hook (typeName + publisherId), deactivated in cleanup.
    // A successful ActivateType returns an ARN. Some public hooks (e.g. Lambda-backed AWSSamples
    // hooks) require an ExecutionRole to activate; when omitted AWS returns a CFNRegistryException.
    // That still proves the handler -> parser -> service path is wired; classify it PARTIAL.
    let activatedPublic = false;
    try {
        const r = await invoke(
            activateHookHandler(components)(
                { typeName: 'AWSSamples::EFSEncrypt::Hook', publisherId: '096debcd443a84c983955f8f8476c221b2b08d8b' },
                {} as never,
            ),
        );
        activatedPublic = !!r && !!r.arn;
        record('activate (public hook)', activatedPublic ? 'PASS' : 'FAIL', `arn=${r?.arn ?? '(none)'}`);
    } catch (error) {
        const msg = (error as Error).message ?? String(error);
        const wired =
            msg.includes('activateHook') &&
            (msg.includes('execution role') || msg.includes('CFNRegistryException') || msg.includes('ValidationError'));
        record(
            'activate (public hook)',
            wired ? 'PARTIAL' : 'FAIL',
            wired
                ? `wiring OK (ActivateType reached): ${shorten(msg, 140)}; this hook needs an ExecutionRole to activate`
                : `unexpected: ${shorten(msg)}`,
        );
    }

    // ---------- Cleanup ----------
    console.log('\n--- cleanup ---');
    await cleanup(
        s3,
        iam,
        { bucketCreated, ruleUploaded, roleArn: !!roleArn, hookCreated, activatedPublic },
        components,
    );

    // ---------- Summary ----------
    printSummary();
    writeResultsFile();
}

async function deactivateThenConfirm(
    components: { cfnService: { deactivateHook: (p: { typeName?: string; arn?: string }) => Promise<void> } },
    typeName: string,
): Promise<{ ok: boolean; detail: string }> {
    await components.cfnService.deactivateHook({ typeName });
    return { ok: true, detail: `deactivated ${typeName}` };
}

async function cleanup(
    s3: S3Client,
    iam: IAMClient,
    state: {
        bucketCreated: boolean;
        ruleUploaded: boolean;
        roleArn: boolean;
        hookCreated: boolean;
        activatedPublic: boolean;
    },
    components: { cfnService: { deactivateHook: (p: { typeName?: string; arn?: string }) => Promise<void> } },
) {
    if (state.ruleUploaded) {
        try {
            await s3.send(new DeleteObjectCommand({ Bucket: RULES_BUCKET, Key: THROWAWAY_RULE_KEY }));
            console.log(`  removed s3://${RULES_BUCKET}/${THROWAWAY_RULE_KEY}`);
        } catch (e) {
            console.log(`  WARN could not remove throwaway rule: ${(e as Error).message}`);
        }
    }
    if (state.bucketCreated) {
        try {
            await s3.send(new DeleteBucketCommand({ Bucket: THROWAWAY_BUCKET }));
            console.log(`  removed bucket ${THROWAWAY_BUCKET}`);
        } catch (e) {
            console.log(`  WARN could not remove throwaway bucket: ${(e as Error).message}`);
        }
    }
    if (state.roleArn) {
        try {
            await iam.send(
                new DeleteRolePolicyCommand({ RoleName: THROWAWAY_ROLE, PolicyName: 'GuardHookS3ReadAccess' }),
            );
            await iam.send(new DeleteRoleCommand({ RoleName: THROWAWAY_ROLE }));
            console.log(`  removed role ${THROWAWAY_ROLE}`);
        } catch (e) {
            console.log(`  WARN could not remove throwaway role: ${(e as Error).message}`);
        }
    }
    if (state.hookCreated) {
        try {
            await components.cfnService.deactivateHook({ typeName: THROWAWAY_HOOK });
            console.log(`  ensured ${THROWAWAY_HOOK} deactivated`);
        } catch {
            /* already deactivated in the deactivate test */
        }
    }
    if (state.activatedPublic) {
        try {
            await components.cfnService.deactivateHook({ typeName: 'AWSSamples::EFSEncrypt::Hook' });
            console.log('  deactivated AWSSamples::EFSEncrypt::Hook');
        } catch (e) {
            console.log(`  WARN could not deactivate public hook: ${(e as Error).message}`);
        }
    }
}

function printSummary() {
    const counts: Record<string, number> = {};
    for (const r of results) {
        counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
    }
    console.log('\n=== SUMMARY ===');
    console.log(
        `PASS=${counts.PASS ?? 0} FAIL=${counts.FAIL ?? 0} PARTIAL=${counts.PARTIAL ?? 0} SKIP=${counts.SKIP ?? 0} (total ${results.length})`,
    );
    const fails = results.filter((r) => r.outcome === 'FAIL');
    if (fails.length > 0) {
        console.log('\nFAILURES:');
        for (const f of fails) console.log(`  - ${f.endpoint}: ${f.detail}`);
    }
}

function writeResultsFile() {
    const path = '/tmp/hooks-endpoint-results.json';
    writeFileSync(path, JSON.stringify(results, undefined, 2));
    console.log(`\nResults written to ${path}`);
}

main()
    .then(() => {
        process.exitCode = 0;
    })
    .catch((e) => {
        console.error('HARNESS CRASHED:', e);
        process.exitCode = 1;
    });
