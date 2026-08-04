import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    handle: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
    disabled: z.boolean().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z.object({
        name: z.string().nullish(),
        email: z.string().nullish(),
        handle: z.string().nullish(),
        title: z.string().nullish(),
        status: z.string().nullish(),
        disabled: z.boolean().nullish(),
        created_at: z.string().nullish(),
        modified_at: z.string().nullish()
    })
});

const CheckpointSchema = z.object({
    page_number: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync users in this account.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint: z.infer<typeof CheckpointSchema> | null = await nango.getCheckpoint();
        let pageNumber = checkpoint?.page_number ?? 0;

        await nango.trackDeletesStart('User');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/users/#list-all-users
            endpoint: 'v2/users',
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

        for await (const batch of nango.paginate(proxyConfig)) {
            if (!Array.isArray(batch)) {
                throw new Error('Expected paginated batch to be an array');
            }

            const users = [];
            for (const raw of batch) {
                const parsed = ProviderUserSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user: ${parsed.error.message}`);
                }

                const record = parsed.data;
                users.push({
                    id: record.id,
                    ...(record.attributes.name != null && { name: record.attributes.name }),
                    ...(record.attributes.email != null && { email: record.attributes.email }),
                    ...(record.attributes.handle != null && { handle: record.attributes.handle }),
                    ...(record.attributes.title != null && { title: record.attributes.title }),
                    ...(record.attributes.status != null && { status: record.attributes.status }),
                    ...(record.attributes.disabled != null && { disabled: record.attributes.disabled }),
                    ...(record.attributes.created_at != null && { created_at: record.attributes.created_at }),
                    ...(record.attributes.modified_at != null && { modified_at: record.attributes.modified_at })
                });
            }

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
                pageNumber += 1;
                await nango.saveCheckpoint({ page_number: pageNumber });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
