import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Users V2#ShowPagingProvider
const InputSchema = z.object({ user_id: z.string() }).passthrough();

const ProviderResponseSchema = z
    .object({ preferred_escalation_provider: z.enum(['native', 'opsgenie', 'pagerduty', 'splunk_on_call']).optional() })
    .passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Get a user paging provider in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v2/users/${encodeURIComponent(input['user_id'])}/paging_provider`,
            retries: 3
        };
        const response = await nango.get(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
