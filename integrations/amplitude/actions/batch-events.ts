import { z } from 'zod';
import { createAction } from 'nango';

const EventSchema = z
    .object({
        user_id: z.string().optional(),
        device_id: z.string().optional(),
        event_type: z.string(),
        time: z.number().optional(),
        event_properties: z.record(z.string(), z.unknown()).optional(),
        user_properties: z.record(z.string(), z.unknown()).optional(),
        groups: z.record(z.string(), z.unknown()).optional(),
        group_properties: z.record(z.string(), z.unknown()).optional(),
        app_version: z.string().optional(),
        platform: z.string().optional(),
        os_name: z.string().optional(),
        os_version: z.string().optional(),
        device_brand: z.string().optional(),
        device_manufacturer: z.string().optional(),
        device_model: z.string().optional(),
        carrier: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        city: z.string().optional(),
        dma: z.string().optional(),
        language: z.string().optional(),
        price: z.number().optional(),
        quantity: z.number().optional(),
        revenue: z.number().optional(),
        productId: z.string().optional(),
        revenueType: z.string().optional(),
        location_lat: z.number().optional(),
        location_lng: z.number().optional(),
        ip: z.string().optional(),
        idfa: z.string().optional(),
        idfv: z.string().optional(),
        adid: z.string().optional(),
        android_id: z.string().optional(),
        insert_id: z.string().optional(),
        library: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    events: z.array(EventSchema).min(1).max(2000).describe('Events to upload. Max 2000 events per request.')
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    server_upload_time: z.number().optional(),
    payload_size_bytes: z.number().optional(),
    events_ingested: z.number().optional()
});

const OutputSchema = z.object({
    code: z.number(),
    server_upload_time: z.number().optional(),
    payload_size_bytes: z.number().optional(),
    events_ingested: z.number().optional()
});

const BasicCredentialsSchema = z.object({
    type: z.literal('BASIC'),
    username: z.string()
});

const ApiKeyCredentialsSchema = z.object({
    type: z.literal('API_KEY'),
    apiKey: z.string()
});

const ErrorWithStatusSchema = z.object({
    status: z.number().optional()
});

function getApiKey(credentials: unknown): string | null {
    const basic = BasicCredentialsSchema.safeParse(credentials);
    if (basic.success) {
        return basic.data.username;
    }
    const apiKey = ApiKeyCredentialsSchema.safeParse(credentials);
    if (apiKey.success) {
        return apiKey.data.apiKey;
    }
    return null;
}

async function sendBatch(nango: NangoActionLocal, apiKey: string, events: Array<z.infer<typeof EventSchema>>): Promise<z.infer<typeof ProviderResponseSchema>> {
    // @allowTryCatch We need to handle 413 Payload Too Large by splitting the batch into smaller chunks.
    try {
        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/batch-event-upload
            endpoint: '/batch',
            baseUrlOverride: 'https://api2.amplitude.com',
            data: {
                api_key: apiKey,
                events
            },
            retries: 1
        });

        return ProviderResponseSchema.parse(response.data);
    } catch (error) {
        const parsedError = ErrorWithStatusSchema.safeParse(error);
        if (parsedError.success && parsedError.data.status === 413 && events.length > 1) {
            const mid = Math.floor(events.length / 2);
            const first = await sendBatch(nango, apiKey, events.slice(0, mid));
            const second = await sendBatch(nango, apiKey, events.slice(mid));
            return {
                code: first.code,
                server_upload_time: second.server_upload_time,
                payload_size_bytes: (first.payload_size_bytes || 0) + (second.payload_size_bytes || 0),
                events_ingested: (first.events_ingested || 0) + (second.events_ingested || 0)
            };
        }
        throw error;
    }
}

const action = createAction({
    description: 'Send batched events to Amplitude in bulk.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-events',
        group: 'Events'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const apiKey = getApiKey(connection.credentials);
        if (!apiKey) {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'API key is missing from the connection configuration.'
            });
        }

        const result = await sendBatch(nango, apiKey, input.events);

        return {
            code: result.code,
            ...(result.server_upload_time !== undefined && { server_upload_time: result.server_upload_time }),
            ...(result.payload_size_bytes !== undefined && { payload_size_bytes: result.payload_size_bytes }),
            ...(result.events_ingested !== undefined && { events_ingested: result.events_ingested })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
