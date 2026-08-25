import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RoleSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const RawRoleSchema = z.object({
    id: z.string(),
    attributes: z
        .object({
            name: z.string().optional(),
            created_at: z.string().optional(),
            modified_at: z.string().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page_number: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync roles (permission bundles) configured in this account.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Role: RoleSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /v2/roles with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let pageNumber = checkpoint?.page_number ?? 0;

        await nango.trackDeletesStart('Role');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/roles/#list-roles
            endpoint: '/v2/roles',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page[number]',
                offset_start_value: pageNumber,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page[size]',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);
            const roles: Array<z.infer<typeof RoleSchema>> = [];

            for (const raw of rawItems) {
                const parsed = RawRoleSchema.safeParse(raw);

                if (!parsed.success) {
                    throw new Error(`Failed to parse role: ${JSON.stringify(parsed.error.issues)}`);
                }

                const attributes = parsed.data.attributes;
                roles.push({
                    id: parsed.data.id,
                    ...(attributes?.name != null && { name: attributes.name }),
                    ...(attributes?.created_at != null && { created_at: attributes.created_at }),
                    ...(attributes?.modified_at != null && { modified_at: attributes.modified_at })
                });
            }

            if (roles.length > 0) {
                await nango.batchSave(roles, 'Role');
            }

            pageNumber += 1;
            await nango.saveCheckpoint({ page_number: pageNumber });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Role');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
