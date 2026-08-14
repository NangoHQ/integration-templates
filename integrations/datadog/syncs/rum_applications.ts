import { createSync } from 'nango';
import { z } from 'zod';

const ProviderRumApplicationSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z.object({
        name: z.string().optional(),
        type: z.string().optional(),
        application_id: z.string().optional(),
        org_id: z.number().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional(),
        created_by_handle: z.string().optional(),
        updated_by_handle: z.string().optional(),
        is_active: z.boolean().optional(),
        short_name: z.string().optional(),
        tags: z.array(z.string()).optional()
    })
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown())
});

const RumApplicationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    application_id: z.string().optional(),
    org_id: z.number().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    created_by_handle: z.string().optional(),
    updated_by_handle: z.string().optional(),
    is_active: z.boolean().optional(),
    short_name: z.string().optional(),
    tags: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync Real User Monitoring (RUM) applications configured in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        RumApplication: RumApplicationSchema
    },

    exec: async (nango) => {
        // Blocker: GET v2/rum/applications has no changed-since filter, no deleted-record endpoint,
        // and no resumable cursor that returns changed rows only.
        await nango.trackDeletesStart('RumApplication');

        // https://docs.datadoghq.com/api/latest/rum/
        const response = await nango.get({
            endpoint: 'v2/rum/applications',
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new Error(`Failed to parse RUM applications response: ${parsedResponse.error.message}`);
        }

        const applications = [];

        for (const raw of parsedResponse.data.data) {
            const parsed = ProviderRumApplicationSchema.safeParse(raw);

            if (!parsed.success) {
                throw new Error(`Failed to parse RUM application: ${parsed.error.message}`);
            }

            const app = parsed.data;
            const attrs = app.attributes;

            applications.push({
                id: app.id,
                ...(attrs.name !== undefined && { name: attrs.name }),
                ...(attrs.type !== undefined && { type: attrs.type }),
                ...(attrs.application_id !== undefined && { application_id: attrs.application_id }),
                ...(attrs.org_id !== undefined && { org_id: attrs.org_id }),
                ...(attrs.created_at !== undefined && { created_at: attrs.created_at }),
                ...(attrs.updated_at !== undefined && { updated_at: attrs.updated_at }),
                ...(attrs.created_by_handle !== undefined && { created_by_handle: attrs.created_by_handle }),
                ...(attrs.updated_by_handle !== undefined && { updated_by_handle: attrs.updated_by_handle }),
                ...(attrs.is_active !== undefined && { is_active: attrs.is_active }),
                ...(attrs.short_name !== undefined && { short_name: attrs.short_name }),
                ...(attrs.tags !== undefined && { tags: attrs.tags })
            });
        }

        if (applications.length > 0) {
            await nango.batchSave(applications, 'RumApplication');
        }

        await nango.trackDeletesEnd('RumApplication');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
