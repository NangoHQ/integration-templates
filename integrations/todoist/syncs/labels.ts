import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    order: z.number().optional(),
    is_favorite: z.boolean().optional()
});

const ProviderLabelSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    order: z.number().optional(),
    is_favorite: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync personal labels.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Label: LabelSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v1/labels does not support any modified-since or updated-after filter.
        // Unrecognized query params are silently ignored, so incremental filtering is not possible.
        // The dataset is small, so a full refresh with delete tracking is appropriate.
        await nango.trackDeletesStart('Label');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.todoist.com/api/v1#get-all-personal-labels
            endpoint: '/api/v1/labels',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'results',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawLabels = page;
            if (!Array.isArray(rawLabels)) {
                throw new Error('Unexpected non-array page from nango.paginate');
            }

            const labels: Array<z.infer<typeof LabelSchema>> = [];

            for (const raw of rawLabels) {
                const parsed = ProviderLabelSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse label: ${parsed.error.message}`);
                }

                const label = parsed.data;
                labels.push({
                    id: label.id,
                    name: label.name,
                    ...(label.color !== undefined && { color: label.color }),
                    ...(label.order !== undefined && { order: label.order }),
                    ...(label.is_favorite !== undefined && { is_favorite: label.is_favorite })
                });
            }

            if (labels.length > 0) {
                await nango.batchSave(labels, 'Label');
            }
        }

        await nango.trackDeletesEnd('Label');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
