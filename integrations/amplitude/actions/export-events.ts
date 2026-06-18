import { z } from 'zod';
import { createAction } from 'nango';
import unzipper from 'unzipper';

const InputSchema = z.object({
    start: z.string().describe('Start hour, formatted YYYYMMDDTHH. Example: "20260616T00"'),
    end: z.string().describe('End hour, formatted YYYYMMDDTHH. Example: "20260616T01"'),
    limit: z.number().optional().describe('Maximum number of events to return. Default: 100')
});

const EventSchema = z
    .object({
        server_received_time: z.string().optional(),
        app: z.number().optional(),
        device_carrier: z.string().optional(),
        city: z.string().optional(),
        user_id: z.string().optional(),
        uuid: z.string().optional(),
        event_time: z.string().optional(),
        platform: z.string().optional(),
        os_version: z.string().optional(),
        amplitude_id: z.number().optional(),
        processed_time: z.string().optional(),
        version_name: z.string().optional(),
        ip_address: z.string().optional(),
        paying: z.boolean().optional(),
        dma: z.string().optional(),
        group_properties: z.record(z.string(), z.unknown()).optional(),
        user_properties: z.record(z.string(), z.unknown()).optional(),
        client_upload_time: z.string().optional(),
        $insert_id: z.string().optional(),
        event_type: z.string().optional(),
        library: z.string().optional(),
        amplitude_attribution_ids: z.string().optional(),
        device_type: z.string().optional(),
        start_version: z.string().optional(),
        location_lng: z.number().optional(),
        server_upload_time: z.string().optional(),
        event_id: z.number().optional(),
        location_lat: z.number().optional(),
        os_name: z.string().optional(),
        groups: z.record(z.string(), z.unknown()).optional(),
        event_properties: z.record(z.string(), z.unknown()).optional(),
        data: z.record(z.string(), z.unknown()).optional(),
        device_id: z.string().optional(),
        language: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        session_id: z.number().optional(),
        device_family: z.string().optional(),
        sample_rate: z.unknown().optional(),
        client_event_time: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    start: z.string(),
    end: z.string(),
    events: z.array(EventSchema),
    total_returned: z.number(),
    has_more: z.boolean().optional()
});

const action = createAction({
    description: 'Start or retrieve bounded event export',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/export-events',
        group: 'Export'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api_key'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;

        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'] ?? 'amplitude.com';
        const baseUrlOverride = hostname !== 'amplitude.com' ? `https://${hostname}` : undefined;

        let response;
        // @allowTryCatch The Amplitude Export API returns 404 when no data exists for the requested time range.
        // This is an expected condition, so we catch it and return an empty event list instead of failing.
        try {
            response = await nango.get({
                // https://amplitude.com/docs/apis/analytics/export
                endpoint: '/api/2/export',
                ...(baseUrlOverride && { baseUrlOverride }),
                params: {
                    start: input.start,
                    end: input.end
                },
                responseType: 'arraybuffer',
                retries: 3
            });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'status' in err.response) {
                const errorStatus = Number(err.response.status);
                if (errorStatus === 404) {
                    return {
                        start: input.start,
                        end: input.end,
                        events: [],
                        total_returned: 0,
                        has_more: false
                    };
                }
                if (errorStatus === 400) {
                    throw new nango.ActionError({
                        type: 'export_too_large',
                        message: 'The exported data exceeds the 4GB size limit. Choose a smaller time range.'
                    });
                }
                if (errorStatus === 429) {
                    throw new nango.ActionError({
                        type: 'rate_limited',
                        message: 'API rate limit exceeded.'
                    });
                }
                if (errorStatus === 504) {
                    throw new nango.ActionError({
                        type: 'timeout',
                        message: 'The export request timed out due to large data volume. Try a smaller time range.'
                    });
                }
            }
            throw new nango.ActionError({
                type: 'export_failed',
                message: err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Export request failed.'
            });
        }

        if (response.status === 404) {
            return {
                start: input.start,
                end: input.end,
                events: [],
                total_returned: 0,
                has_more: false
            };
        }

        if (response.status === 400) {
            throw new nango.ActionError({
                type: 'export_too_large',
                message: 'The exported data exceeds the 4GB size limit. Choose a smaller time range.'
            });
        }

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'API rate limit exceeded.',
                retry_after: typeof response.headers['x-ratelimit-reset'] === 'string' ? response.headers['x-ratelimit-reset'] : undefined
            });
        }

        if (response.status === 504) {
            throw new nango.ActionError({
                type: 'timeout',
                message: 'The export request timed out due to large data volume. Try a smaller time range.'
            });
        }

        if (response.status !== 200) {
            throw new nango.ActionError({
                type: 'export_failed',
                message: 'Export API returned unexpected status: ' + response.status
            });
        }

        const data = response.data;
        if (data === null || data === undefined || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected binary response from export API.'
            });
        }

        const buffer = Buffer.from(data);
        let rawText: string;

        // @allowTryCatch The Export API may return a ZIP archive or plain text.
        // If unzipper fails (e.g., plain text or gzip), fall back to raw text.
        try {
            const directory = await unzipper.Open.buffer(buffer);
            const files = directory.files;
            const fileTexts: string[] = [];
            for (const file of files) {
                const fileBuffer = await file.buffer();
                fileTexts.push(fileBuffer.toString('utf8'));
            }
            rawText = fileTexts.join('\n');
        } catch {
            rawText = buffer.toString('utf8');
        }

        const lines = rawText.split('\n').filter((line) => line.trim().length > 0);
        const events: z.infer<typeof EventSchema>[] = [];
        let hitLimit = false;

        for (let i = 0; i < lines.length; i++) {
            if (events.length >= limit) {
                hitLimit = true;
                break;
            }

            const line = lines[i];
            if (!line) {
                continue;
            }

            let parsed: unknown;
            // @allowTryCatch NDJSON lines may occasionally be malformed; skip them.
            try {
                parsed = JSON.parse(line);
            } catch {
                continue;
            }

            const eventResult = EventSchema.safeParse(parsed);
            if (eventResult.success) {
                events.push(eventResult.data);
            }
        }

        return {
            start: input.start,
            end: input.end,
            events,
            total_returned: events.length,
            has_more: hitLimit
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
