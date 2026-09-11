import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json
// Operation: createProjectBranchRole
const InputSchema = z
    .object({
        project_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The Neon project ID'),
        branch_id: z.string().regex(new RegExp('^[a-z0-9-]{1,60}$')).describe('The branch ID'),
        body: z.object({
            role: z
                .object({
                    name: z.string().describe('The role name. Cannot exceed 63 bytes in length.\n'),
                    no_login: z.boolean().describe('Whether to create a role that cannot login.\n').optional()
                })
                .describe('Properties of the role to create.')
        })
    })
    .refine((input) => new TextEncoder().encode(input.body.role.name).length <= 63, {
        message: 'Role names cannot exceed 63 UTF-8 bytes',
        path: ['body', 'role', 'name']
    });

const ProviderResponseSchema = z
    .object({
        role: z
            .object({
                branch_id: z.string(),
                name: z.string(),
                password: z.string().optional(),
                protected: z.boolean().optional(),
                authentication_method: z.string().optional(),
                created_at: z.string(),
                updated_at: z.string()
            })
            .passthrough(),
        operations: z.array(
            z
                .object({
                    id: z.string(),
                    project_id: z.string(),
                    branch_id: z.string().optional(),
                    endpoint_id: z.string().optional(),
                    action: z.enum([
                        'create_compute',
                        'create_timeline',
                        'start_compute',
                        'suspend_compute',
                        'apply_config',
                        'check_availability',
                        'delete_timeline',
                        'create_branch',
                        'import_data',
                        'tenant_ignore',
                        'tenant_attach',
                        'tenant_detach',
                        'tenant_detach_safekeepers',
                        'tenant_attach_safekeepers',
                        'tenant_reattach',
                        'replace_safekeeper',
                        'disable_maintenance',
                        'apply_storage_config',
                        'prepare_secondary_pageserver',
                        'switch_pageserver',
                        'detach_parent_branch',
                        'timeline_archive',
                        'timeline_unarchive',
                        'start_reserved_compute',
                        'sync_dbs_and_roles_from_compute',
                        'apply_schema_from_branch',
                        'timeline_mark_invisible',
                        'timeline_update_protected_config',
                        'prewarm_replica',
                        'promote_replica',
                        'set_storage_non_dirty',
                        'swap_binding_id',
                        'finalize_migration',
                        'mark_migration_prepared',
                        'update_catalog',
                        'epc_sync'
                    ]),
                    status: z.enum(['scheduling', 'running', 'finished', 'failed', 'error', 'cancelling', 'cancelled', 'skipped']),
                    error: z.string().optional(),
                    failures_count: z.number().int(),
                    retry_at: z.string().optional(),
                    created_at: z.string(),
                    updated_at: z.string(),
                    total_duration_ms: z.number().int()
                })
                .passthrough()
        )
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description:
        'Create role. Creates a Postgres role in the specified branch.\nFor related information, see [Manage roles](https://neon.com/docs/manage/roles/).\n\nConnections established to the active compute endpoint will be dropped.\nIf the compute endpoint is idle, the endpoint becomes active for a short period of time and is suspended afterward.\n',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/neondatabase/neon-pkgs/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/sdk/spec/neon-openapi.json,
            endpoint: `/v2/projects/${encodeURIComponent(input['project_id'])}/branches/${encodeURIComponent(input['branch_id'])}/roles`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
