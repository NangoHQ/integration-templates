import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RoleSchema = z
    .object({
        id: z.string().describe('Unique identifier of the role.'),
        name: z.string().describe('Display name of the role.'),
        description: z.string().optional().describe('Detailed description of the role permissions and scope.'),
        default: z.boolean().describe('Whether this is a built-in default role provided by Freshdesk.'),
        created_at: z.string().describe('UTC ISO 8601 timestamp when the role was created.'),
        updated_at: z.string().describe('UTC ISO 8601 timestamp when the role was last updated.')
    })
    .describe('Freshdesk agent role defining permissions and access levels.');

const ProviderRoleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    default: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync agent roles from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Role: RoleSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        if (parsedCheckpoint.success) {
            // Intentionally not restoring page cursor for delete-tracked syncs.
            void parsedCheckpoint.data.page;
        }

        const page = 1;
        let nextPage: number | undefined = page;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#list_all_roles
            endpoint: '/api/v2/roles',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        await nango.trackDeletesStart('Role');

        for await (const batch of nango.paginate(proxyConfig)) {
            const items: unknown[] = batch;
            const roles = items.map((item) => {
                const parsed = ProviderRoleSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse role: ${parsed.error.message}`);
                }
                const record = parsed.data;
                return {
                    id: String(record.id),
                    name: record.name,
                    ...(record.description != null && { description: record.description }),
                    default: record.default,
                    created_at: record.created_at,
                    updated_at: record.updated_at
                };
            });

            if (roles.length > 0) {
                await nango.batchSave(roles, 'Role');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Role');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
