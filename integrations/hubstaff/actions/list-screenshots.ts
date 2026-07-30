import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "775646"'),
    start: z.string().describe('Start of the time range in ISO 8601 format. Example: "2026-07-29T00:00:00Z"'),
    stop: z.string().describe('End of the time range in ISO 8601 format. Example: "2026-07-30T00:00:00Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ScreenshotSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    screenshots: z.array(ScreenshotSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List screenshots captured during tracked time, within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: `v2/organizations/${encodeURIComponent(input.organization_id)}/screenshots`,
            params: {
                'time_slot[start]': input.start,
                'time_slot[stop]': input.stop,
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                screenshots: z.array(z.object({}).passthrough()).default([]),
                next_cursor: z.string().optional().nullable()
            })
            .passthrough()
            .parse(response.data);

        return {
            screenshots: providerResponse.screenshots,
            ...(providerResponse.next_cursor != null && { next_cursor: providerResponse.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
