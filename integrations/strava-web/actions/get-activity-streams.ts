import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    activityId: z.number().describe('Strava activity ID. Example: 19350267303'),
    keys: z
        .array(z.string())
        .optional()
        .describe(
            'Stream types to request. Valid values: time, latlng, distance, altitude, velocity_smooth, heartrate, cadence, watts, temp, moving, grade_smooth. Defaults to [time, latlng, distance, altitude].'
        )
});

const StreamSchema = z
    .object({
        data: z.array(z.unknown()),
        series_type: z.string(),
        original_size: z.number(),
        resolution: z.string()
    })
    .passthrough();

const OutputSchema = z.record(z.string(), StreamSchema);

const DEFAULT_KEYS = ['time', 'latlng', 'distance', 'altitude'];

const VALID_STREAM_KEYS = ['time', 'latlng', 'distance', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'temp', 'moving', 'grade_smooth'];

const action = createAction({
    description: 'Get the time-series data streams (latlng, distance, altitude, heartrate, etc.) for an activity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['activity:read_all'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestedKeys = input.keys && input.keys.length > 0 ? input.keys : DEFAULT_KEYS;
        const invalidKeys = requestedKeys.filter((key) => !VALID_STREAM_KEYS.includes(key));

        if (invalidKeys.length > 0) {
            throw new nango.ActionError({
                type: 'invalid_keys',
                message: `Invalid stream keys: ${invalidKeys.join(', ')}. Valid keys are: ${VALID_STREAM_KEYS.join(', ')}.`,
                invalid_keys: invalidKeys
            });
        }

        const activityId = String(input.activityId);
        const keysParam = requestedKeys.join(',');

        // https://developers.strava.com/docs/reference/#api-Streams-getActivityStreams
        let response;
        // @allowTryCatch Strava returns 404 for manual activities that have no GPS/sensor data.
        // We catch the HTTP error and rethrow as ActionError so callers get a typed expected failure.
        try {
            response = await nango.get({
                endpoint: `/api/v3/activities/${encodeURIComponent(activityId)}/streams`,
                params: {
                    keys: keysParam,
                    key_by_type: 'true'
                },
                retries: 3
            });
        } catch (err) {
            if (err !== null && typeof err === 'object' && 'status' in err && typeof err.status === 'number' && err.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Activity streams not found. This usually means the activity is manual (no GPS/sensor data) or the activity does not exist.',
                    activity_id: input.activityId
                });
            }
            throw err;
        }

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Empty or invalid response from Strava streams API.',
                activity_id: input.activityId
            });
        }

        const streams = OutputSchema.parse(response.data);
        return streams;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
