import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventId: z.string().describe('Event ID of the appointment to delete. Example: "ocQHyuzHvysMo5N5VsXc"')
});

const ProviderResponseSchema = z.object({
    succeeded: z.boolean().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    eventId: z.string()
});

const action = createAction({
    description: 'Delete an appointment in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['calendars/events.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://highlevel.stoplight.io/docs/integrations/calendars/delete-event
            endpoint: `/calendars/events/${encodeURIComponent(input.eventId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: {},
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.succeeded ?? true,
            eventId: input.eventId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
