import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    api_key: z.string().describe('PostHog project API key (token) for the Capture API.'),
    event: z.string().describe('Name of the event to capture.'),
    distinct_id: z.string().describe('Unique identifier for the user or entity.'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Additional event properties.'),
    timestamp: z.string().optional().describe('ISO 8601 timestamp for the event. Defaults to now if omitted.')
});

const OutputSchema = z.object({
    status: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'Capture a PostHog event.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://posthog.com/docs/api/capture
            endpoint: '/capture/',
            data: {
                api_key: input.api_key,
                event: input.event,
                distinct_id: input.distinct_id,
                ...(input.properties !== undefined && { properties: input.properties }),
                ...(input.timestamp !== undefined && { timestamp: input.timestamp })
            },
            retries: 3
        });

        if (response.data && typeof response.data === 'object') {
            const parsed = OutputSchema.parse(response.data);
            return parsed;
        }

        if (typeof response.data === 'string' || typeof response.data === 'number') {
            return { status: response.data };
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
