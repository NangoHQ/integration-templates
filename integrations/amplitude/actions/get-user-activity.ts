import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        user: z.string().describe('Amplitude ID of the user.'),
        offset: z.number().optional().describe('Zero-indexed offset from the most recent event to start returning events from.'),
        limit: z
            .number()
            .max(1000)
            .optional()
            .describe('Number of events to return, up to 1000. The API may return more events than requested to avoid splitting sessions. Defaults to 1000.'),
        direction: z
            .enum(['earliest', 'latest'])
            .optional()
            .describe("Direction to query events: 'earliest' for the user's earliest events, or 'latest' for the most recent. Defaults to 'latest'.")
    })
    .describe("Input for retrieving a user's event history and summary by Amplitude ID.");

const UserDataSchema = z
    .object({
        user_id: z.string().nullish().describe('User ID.'),
        canonical_amplitude_id: z.number().nullish().describe('Canonical Amplitude ID.'),
        merged_amplitude_ids: z.array(z.number()).nullish().describe('Merged Amplitude IDs.'),
        num_events: z.number().nullish().describe('Total number of events.'),
        num_sessions: z.number().nullish().describe('Total number of sessions.'),
        usage_time: z.number().nullish().describe('Total usage time in milliseconds.'),
        first_used: z.string().nullish().describe('First seen date (YYYY-MM-DD).'),
        last_used: z.string().nullish().describe('Last seen date (YYYY-MM-DD).'),
        purchases: z.union([z.number(), z.string()]).nullish().describe('Number of purchases.'),
        revenue: z.union([z.number(), z.string()]).nullish().describe('Total revenue.'),
        platform: z.string().nullish().describe('Platform.'),
        os: z.string().nullish().describe('Operating system.'),
        version: z.string().nullish().describe('App version.'),
        device: z.string().nullish().describe('Device name.'),
        device_type: z.string().nullish().describe('Device type.'),
        carrier: z.string().nullish().describe('Carrier.'),
        country: z.string().nullish().describe('Country.'),
        region: z.string().nullish().describe('Region.'),
        city: z.string().nullish().describe('City.'),
        dma: z.string().nullish().describe('Designated market area.'),
        language: z.string().nullish().describe('Language.'),
        start_version: z.string().nullish().describe('Start version.'),
        device_ids: z.array(z.string()).nullish().describe('Device IDs associated with the user.'),
        last_location: z
            .object({
                lat: z.union([z.number(), z.string()]).nullish().describe('Latitude of the last known location.'),
                lng: z.union([z.number(), z.string()]).nullish().describe('Longitude of the last known location.')
            })
            .passthrough()
            .nullish()
            .describe('Last known location.'),
        properties: z.record(z.string(), z.unknown()).nullish().describe('Custom user properties.')
    })
    .passthrough();

const EventSchema = z.object({}).passthrough();

const OutputSchema = z
    .object({
        userData: UserDataSchema.optional().describe("Total statistics about the user and the user's properties."),
        events: z.array(EventSchema).optional().describe('Array of events the user performed.')
    })
    .describe("Output containing a user's event history and summary statistics.");

/**
 * @tags: [read]
 * @tagReason: Retrieves a user's event history and summary from Amplitude without making any changes.
 * @pitfalls: Requests for non-existent users return HTTP 200 with empty events and default-filled userData rather than an error, and the API may return more events than the requested limit to avoid splitting sessions.
 */
const action = createAction({
    description: "Get a user's event history and summary by Amplitude ID.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const hostname = connection.connection_config?.['hostname'];
        const baseUrlOverride = hostname === 'analytics.eu.amplitude.com' ? 'https://analytics.eu.amplitude.com' : undefined;

        const params: Record<string, string | number> = {
            user: input.user
        };

        if (input['offset'] !== undefined) {
            params['offset'] = input['offset'];
        }

        if (input['limit'] !== undefined) {
            params['limit'] = input['limit'];
        }

        if (input['direction'] !== undefined) {
            params['direction'] = input['direction'];
        }

        // https://amplitude.com/docs/apis/analytics/dashboard-rest#user-activity
        const response = await nango.get({
            endpoint: '/api/2/useractivity',
            params,
            baseUrlOverride,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
