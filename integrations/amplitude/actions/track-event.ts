import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().optional().describe('Amplitude user ID. Required if device_id is not provided.'),
    device_id: z.string().optional().describe('Amplitude device ID. Required if user_id is not provided.'),
    event_type: z.string().describe('The type of event. Example: "Button Clicked"'),
    time: z.number().optional().describe('Event timestamp in milliseconds since epoch.'),
    event_properties: z.record(z.string(), z.unknown()).optional().describe('Custom event properties.'),
    user_properties: z.record(z.string(), z.unknown()).optional().describe('Custom user properties.'),
    session_id: z.number().optional().describe('Session ID for the event.'),
    insert_id: z.string().optional().describe('A unique identifier for the event.')
});

const OutputSchema = z.object({
    code: z.number(),
    server_upload_time: z.number(),
    payload_size_bytes: z.number(),
    events_ingested: z.number()
});

const ConnectionSchema = z.object({
    credentials: z.object({
        type: z.string(),
        username: z.string().optional(),
        apiKey: z.string().optional()
    })
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    server_upload_time: z.number(),
    payload_size_bytes: z.number(),
    events_ingested: z.number()
});

const action = createAction({
    description: 'Send an event to Amplitude.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = ConnectionSchema.parse(await nango.getConnection());
        const apiKey = connection.credentials.username || connection.credentials.apiKey;

        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key is missing from connection credentials.'
            });
        }

        if (!input.user_id && !input.device_id) {
            throw new nango.ActionError({
                type: 'missing_input',
                message: 'Either user_id or device_id must be provided.'
            });
        }

        const event = {
            event_type: input.event_type,
            ...(input.user_id !== undefined && { user_id: input.user_id }),
            ...(input.device_id !== undefined && { device_id: input.device_id }),
            ...(input.time !== undefined && { time: input.time }),
            ...(input.event_properties !== undefined && { event_properties: input.event_properties }),
            ...(input.user_properties !== undefined && { user_properties: input.user_properties }),
            ...(input.session_id !== undefined && { session_id: input.session_id }),
            ...(input.insert_id !== undefined && { insert_id: input.insert_id })
        };

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/http-v2
            endpoint: '/2/httpapi',
            baseUrlOverride: 'https://api2.amplitude.com',
            data: {
                api_key: apiKey,
                events: [event]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        return {
            code: providerResponse.code,
            server_upload_time: providerResponse.server_upload_time,
            payload_size_bytes: providerResponse.payload_size_bytes,
            events_ingested: providerResponse.events_ingested
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
