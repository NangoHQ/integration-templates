import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    calendarId: z.string().describe('Calendar ID. Example: "ocQHyuzHvysMo5N5VsXc"')
});

const ProviderResponseSchema = z.object({
    success: z.boolean().optional()
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a calendar in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://highlevel.stoplight.io/docs/integrations/
        const response = await nango.delete({
            endpoint: `/calendars/${encodeURIComponent(input.calendarId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data || {});

        return {
            success: providerResponse.success ?? true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
