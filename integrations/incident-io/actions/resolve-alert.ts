import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Alerts V2#Resolve
const InputSchema = z.object({ id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({
        alert: z
            .object({
                alert_group_ids: z.array(z.string()).optional(),
                alert_source_id: z.string(),
                attributes: z.array(
                    z
                        .object({
                            array_value: z
                                .array(
                                    z
                                        .object({
                                            catalog_entry: z.object({ catalog_type_id: z.string(), id: z.string(), name: z.string() }).passthrough().optional(),
                                            label: z.string().optional(),
                                            literal: z.string().optional()
                                        })
                                        .passthrough()
                                )
                                .optional(),
                            attribute: z
                                .object({
                                    array: z.boolean(),
                                    emoji: z.string().optional(),
                                    id: z.string(),
                                    name: z.string(),
                                    required: z.boolean(),
                                    type: z.string()
                                })
                                .passthrough(),
                            value: z
                                .object({
                                    catalog_entry: z.object({ catalog_type_id: z.string(), id: z.string(), name: z.string() }).passthrough().optional(),
                                    label: z.string().optional(),
                                    literal: z.string().optional()
                                })
                                .passthrough()
                                .optional()
                        })
                        .passthrough()
                ),
                created_at: z.string(),
                deduplication_key: z.string(),
                description: z.string().optional(),
                id: z.string(),
                resolved_at: z.string().optional(),
                source_url: z.string().optional(),
                status: z.enum(['firing', 'resolved']),
                tags: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()).optional(),
                title: z.string(),
                updated_at: z.string()
            })
            .passthrough()
    })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Resolve alert in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/alerts/${encodeURIComponent(input['id'])}/actions/resolve`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
