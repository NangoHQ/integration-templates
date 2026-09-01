import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required');

const OutputSchema = z
    .object({
        url: z.string().describe('API URL for the current token owner').optional(),
        app_url: z.string().describe('Web app URL for the current token owner').optional(),
        time_zone_name: z.string().describe('Rails-style time zone name, e.g. "Moscow"').optional(),
        first_week_day: z.string().describe('First day of the week, e.g. "Sunday"').optional(),
        time_format: z.string().describe('Time format preference, e.g. "twelve_hour"').optional()
    })
    .describe("The current token owner's account preferences");

/**
 * @tags: [read]
 * @tagReason: Only reads the current token owner's preferences.
 * @pitfalls: time_zone_name is a Rails-style zone name (e.g. "Moscow") rather than an IANA identifier.
 */
const action = createAction({
    description: "Get the current token owner's account preferences (time zone, first day of week, time format).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/authentication.md
            endpoint: '/my/preferences.json',
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from provider'
            });
        }

        return {
            ...(raw.url != null && { url: String(raw.url) }),
            ...(raw.app_url != null && { app_url: String(raw.app_url) }),
            ...(raw.time_zone_name != null && { time_zone_name: String(raw.time_zone_name) }),
            ...(raw.first_week_day != null && { first_week_day: String(raw.first_week_day) }),
            ...(raw.time_format != null && { time_format: String(raw.time_format) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
