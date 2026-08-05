import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CaseProjectSchema = z.object({
    id: z.string(),
    key: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    attributes: z
        .object({
            key: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            created_at: z.string().optional(),
            updated_at: z.string().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderProjectSchema)
});

const sync = createSync({
    description: 'Sync case-management projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        CaseProject: CaseProjectSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('CaseProject');

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/case-management/
            endpoint: 'v2/cases/projects',
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse case projects response: ${parsed.error.message}`);
        }

        const items = parsed.data.data;
        const projects = items.map((item) => {
            const attrs = item.attributes;
            return {
                id: item.id,
                ...(attrs?.key != null && { key: attrs.key }),
                ...(attrs?.name != null && { name: attrs.name }),
                ...(attrs?.description != null && { description: attrs.description }),
                ...(attrs?.created_at != null && { created_at: attrs.created_at }),
                ...(attrs?.updated_at != null && { updated_at: attrs.updated_at })
            };
        });

        if (projects.length > 0) {
            await nango.batchSave(projects, 'CaseProject');
        }

        await nango.trackDeletesEnd('CaseProject');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
