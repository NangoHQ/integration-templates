import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    project_id: z.string(),
    base_url: z.string().optional()
});

const LookupTableSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    status: z.string(),
    results: z
        .array(
            z.object({
                id: z.string(),
                name: z.string()
            })
        )
        .nullable()
});

const sync = createSync({
    description: 'Sync Mixpanel lookup tables',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        LookupTable: LookupTableSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.project_id) {
            throw new Error('project_id is required in metadata');
        }

        const baseUrl = metadata.base_url ?? 'https://api.mixpanel.com';

        await nango.trackDeletesStart('LookupTable');

        // https://developer.mixpanel.com/reference/list-lookup-tables
        const response = await nango.get({
            endpoint: '/lookup-tables',
            baseUrlOverride: baseUrl,
            params: {
                project_id: metadata.project_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse lookup tables response: ${parsed.error.message}`);
        }

        const tables = (parsed.data.results ?? []).map((record) => ({
            id: record.id,
            name: record.name
        }));

        if (tables.length > 0) {
            await nango.batchSave(tables, 'LookupTable');
        }

        await nango.trackDeletesEnd('LookupTable');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
