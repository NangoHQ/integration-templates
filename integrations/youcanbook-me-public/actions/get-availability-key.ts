import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    intentId: z.string().describe('Booking intent ID. Example: "itt_3a57aaf2-1f5f-41f6-9098-af57c907259a"'),
    startSearchAt: z.string().optional().describe('Start of the search window as a plain date string. Example: "2026-08-01"'),
    endSearchAt: z.string().optional().describe('End of the search window as a plain date string. Example: "2026-08-31"')
});

const ProviderResponseSchema = z.object({
    key: z.string()
});

const OutputSchema = z.object({
    key: z.string().describe('Short-lived availability key. Example: "avl_728b78bc1dec387d7c6c54071d5c0d7715594728af10b2ab1f346648ed059cecT_34"')
});

const action = createAction({
    description: 'Get a short-lived key representing the searchable availability window for a booking intent, to be passed to get-available-slots.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://forum.youcanbook.me/t/fetch-user-calendar-slots-availability-via-api/2797
            endpoint: `/v1/intents/${encodeURIComponent(input.intentId)}/availabilitykey`,
            params: {
                ...(input.startSearchAt !== undefined && { startSearchAt: input.startSearchAt }),
                ...(input.endSearchAt !== undefined && { endSearchAt: input.endSearchAt })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            key: providerResponse.key
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
