import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://api.incident.io/v1/openapiV3.json
// Operation: Follow-ups V3#Delete
const InputSchema = z.object({ id: z.string() }).passthrough();

// The provider answers 204 No Content, so there is no body to validate.
const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Delete follow up in incident.io.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.incident.io/v1/openapiV3.json,
            endpoint: `/v3/follow_ups/${encodeURIComponent(input['id'])}`,
            retries: 3
        };
        await nango.delete(config);
        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
