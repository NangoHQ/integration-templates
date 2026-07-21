import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    phone_number: z
        .string()
        .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format, e.g. "+12025551234"')
        .describe('Phone number to add to the SMS rejection denylist in E.164 format. Example: "+12025551234"'),
    comment: z.string().optional().describe('Optional comment describing the rejection.')
});

const ProviderResponseSchema = z.object({
    phone: z.string(),
    added: z.boolean().optional(),
    deleted: z.boolean().optional(),
    subaccount: z.string().nullable().optional()
});

const OutputSchema = z.object({
    phone: z.string(),
    added: z.boolean().optional(),
    deleted: z.boolean().optional(),
    subaccount: z.string().optional()
});

const action = createAction({
    description: 'Add a phone number to the SMS rejection denylist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/rejects/
            endpoint: '1.4/rejects/add-sms',
            data: {
                phone: input.phone_number,
                ...(input.comment !== undefined && { comment: input.comment })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            phone: providerResponse.phone,
            ...(providerResponse.added !== undefined && { added: providerResponse.added }),
            ...(providerResponse.deleted !== undefined && { deleted: providerResponse.deleted }),
            ...(providerResponse.subaccount != null && { subaccount: providerResponse.subaccount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
