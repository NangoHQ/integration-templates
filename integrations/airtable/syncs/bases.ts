import type { ProxyConfiguration } from 'nango';
import { createSync } from 'nango';
import { z } from 'zod';

const BaseSchema = z.object({
    id: z.string().describe('The unique identifier for the base. Example: appXXXXXXXXXXXXXX'),
    name: z.string().optional(),
    permissionLevel: z.string().optional()
});

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    permissionLevel: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable bases visible to the authenticated user.',
    version: '2.0.1',
    endpoints: [{ method: 'GET', path: '/syncs/bases' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Base: BaseSchema
    },
    scopes: ['schema.bases:read'],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { offset: '' });
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }
        let offset = parsedCheckpoint.data.offset || undefined;

        await nango.trackDeletesStart('Base');

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/list-bases
            endpoint: '/v0/meta/bases',
            retries: 10,
            params: {
                ...(offset && { offset })
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'offset',
                cursor_name_in_request: 'offset',
                response_path: 'bases',
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            }
        };

        for await (const page of nango.paginate<unknown>(config)) {
            const bases = page.map((item) => {
                const base = ProviderBaseSchema.parse(item);
                return {
                    id: base.id,
                    ...(base.name != null && { name: base.name }),
                    ...(base.permissionLevel != null && { permissionLevel: base.permissionLevel })
                };
            });

            await nango.batchSave(bases, 'Base');

            if (offset !== undefined) {
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Base');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
