import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        setting_keys: z.array(z.string()).min(1).describe('Non-empty list of setting keys to fetch. Example: ["widget_theme", "badge_position"]')
    })
    .describe('Input to fetch specific named settings for the shop.');

const OutputSchema = z
    .object({
        settings: z.record(z.string(), z.unknown()).describe('Map of requested setting keys to their values. Unrecognized keys are omitted.')
    })
    .describe('Output containing the requested shop settings.');

/**
 * @tags: [read]
 * @tagReason: Fetches existing shop configuration values without modifying them.
 * @pitfalls: Unrecognized setting keys are silently omitted from the response with no error indicator, and unset string settings may return empty strings.
 */
const action = createAction({
    description: 'Fetch specific named settings for the shop.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_settings'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = input.setting_keys.map((key) => `setting_keys[]=${encodeURIComponent(key)}`).join('&');

        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: `/api/v1/settings?${query}`,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            settings: z.record(z.string(), z.unknown()).optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            settings: parsed.settings || {}
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
