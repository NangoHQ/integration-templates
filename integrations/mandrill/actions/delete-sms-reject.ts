import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    phone_number: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format, e.g. "+12025551234"')
        .describe('The phone number to remove from the SMS rejection denylist, in E.164 format. Example: "+12025551234"'),
    subaccount: z.string().optional().describe('An optional unique identifier for the subaccount to limit the denylist deletion. Example: "cust-123"')
});

const ProviderResponseSchema = z.object({
    phone: z.string(),
    added: z.boolean().optional(),
    deleted: z.boolean().optional(),
    subaccount: z.string().nullable().optional()
});

const OutputSchema = z.object({
    phone: z.string(),
    deleted: z.boolean().optional(),
    subaccount: z.string().optional()
});

const action = createAction({
    description: 'Remove a phone number from the SMS rejection denylist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/rejects/delete-sms/
            endpoint: '1.4/rejects/delete-sms',
            data: {
                phone: input.phone_number,
                ...(input.subaccount !== undefined && { subaccount: input.subaccount })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            phone: providerResponse.phone,
            ...(providerResponse.deleted !== undefined && { deleted: providerResponse.deleted }),
            ...(providerResponse.subaccount != null && { subaccount: providerResponse.subaccount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
