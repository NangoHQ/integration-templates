import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    contact_count: z.number(),
    billable_count: z.number(),
    identifier_counts: z.record(z.string(), z.number())
});

const ProviderResponseSchema = z
    .object({
        contact_count: z.number(),
        billable_count: z.number(),
        identifier_counts: z.record(z.string(), z.number())
    })
    .passthrough();

const action = createAction({
    description: 'Get total and billable contact counts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/contacts/get-contacts-count
            endpoint: '/v3/marketing/contacts/count',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            contact_count: providerData.contact_count,
            billable_count: providerData.billable_count,
            identifier_counts: providerData.identifier_counts
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
