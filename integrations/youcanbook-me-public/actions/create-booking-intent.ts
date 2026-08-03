import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subdomain: z.string().optional().describe('YouCanBook.me booking page subdomain. Defaults to the connection_config subdomain.')
});

const IntentSchema = z
    .object({
        id: z.string(),
        intentStatus: z.string(),
        selections: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Start a new booking session (intent) against a YouCanBook.me booking page, scoped by subdomain.',
    version: '1.0.0',
    input: InputSchema,
    output: IntentSchema,

    exec: async (nango, input): Promise<z.infer<typeof IntentSchema>> => {
        let subdomain = input.subdomain;

        if (!subdomain) {
            const connection = await nango.getConnection();
            const rawSubdomain = connection.connection_config?.['subdomain'];
            if (rawSubdomain != null) {
                subdomain = String(rawSubdomain);
            }
        }

        if (!subdomain) {
            throw new nango.ActionError({
                type: 'missing_subdomain',
                message: 'Missing subdomain. Provide it as input or in connection_config.'
            });
        }

        const response = await nango.post({
            // https://forum.youcanbook.me/t/fetch-user-calendar-slots-availability-via-api/2797
            endpoint: '/v1/intents',
            data: {
                subdomain: subdomain
            },
            retries: 3
        });

        const providerIntent = IntentSchema.parse(response.data);

        return providerIntent;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
