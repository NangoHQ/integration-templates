import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLabelSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    archived: z.boolean().optional(),
    external_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    description: z.string().optional(),
    archived: z.boolean().optional(),
    external_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const sync = createSync({
    description: 'Sync labels.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Label: LabelSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v3/labels returns a flat, unpaginated array with no
        // incremental filter (updated_since, cursor, or page token), so full
        // refresh is required.
        await nango.trackDeletesStart('Label');

        // https://developer.shortcut.com/api/rest/v3#get-labels
        const response = await nango.get({
            endpoint: '/api/v3/labels',
            params: {
                slim: 'true'
            },
            retries: 3
        });

        const parsed = z.array(ProviderLabelSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse labels: ${parsed.error.message}`);
        }

        const labels = parsed.data.map((label) => ({
            id: String(label.id),
            name: label.name,
            ...(label.color != null && { color: label.color }),
            ...(label.description != null && { description: label.description }),
            ...(label.archived !== undefined && { archived: label.archived }),
            ...(label.external_id != null && { external_id: label.external_id }),
            ...(label.created_at !== undefined && { created_at: label.created_at }),
            ...(label.updated_at !== undefined && { updated_at: label.updated_at })
        }));

        if (labels.length > 0) {
            await nango.batchSave(labels, 'Label');
        }

        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
