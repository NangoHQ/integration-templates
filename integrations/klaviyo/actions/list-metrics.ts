import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const MetricIntegrationSchema = z.object({
    name: z.string().optional(),
    category: z.string().optional()
});

const MetricAttributesSchema = z.object({
    name: z.string(),
    created: z.string().optional(),
    updated: z.string().optional(),
    integration: MetricIntegrationSchema.optional()
});

const MetricSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: MetricAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: z.array(MetricSchema),
    links: z
        .object({
            next: z.string().optional().nullable()
        })
        .optional()
});

const OutputSchema = z.object({
    metrics: z.array(
        z.object({
            id: z.string(),
            type: z.string(),
            name: z.string(),
            created: z.string().optional(),
            updated: z.string().optional(),
            integration: MetricIntegrationSchema.optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List metrics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['metrics:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_metrics
        const response = await nango.get({
            endpoint: '/api/metrics',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const metrics = providerResponse.data.map((metric) => ({
            id: metric.id,
            type: metric.type,
            name: metric.attributes.name,
            ...(metric.attributes.created !== undefined && { created: metric.attributes.created }),
            ...(metric.attributes.updated !== undefined && { updated: metric.attributes.updated }),
            ...(metric.attributes.integration !== undefined && { integration: metric.attributes.integration })
        }));

        let nextCursor: string | undefined;
        const nextLink = providerResponse.links?.next;
        if (nextLink) {
            const url = new URL(nextLink, 'https://a.klaviyo.com');
            const cursor = url.searchParams.get('page[cursor]');
            if (cursor) {
                nextCursor = cursor;
            }
        }

        return {
            metrics,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
