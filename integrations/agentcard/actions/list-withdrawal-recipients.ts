import { createAction } from 'nango';
import type { NangoAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WithdrawalRecipientSchema = z.object({
    object: z.literal('withdrawal_recipient'),
    user_id: z.string(),
    id: z.string(),
    type: z.enum(['ach', 'international_wire']),
    nickname: z.string().nullable(),
    beneficiary_name: z.string(),
    country_code: z.string(),
    currency: z.string().nullable(),
    bank_name: z.string().nullable(),
    account_number_last4: z.string().nullable(),
    routing_number: z.string().nullable(),
    account_type: z.enum(['checking', 'savings']).nullable(),
    iban_last4: z.string().nullable(),
    swift_code: z.string().nullable(),
    created_at: z.string()
});

const OutputSchema = z.object({
    object: z.literal('list'),
    data: z.array(WithdrawalRecipientSchema)
});

const InputSchema = z.object({
    user_id: z.string()
});

export default createAction({
    description: "List a connected user's saved, active withdrawal bank destinations.",
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango: NangoAction, input: z.infer<typeof InputSchema>): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.agentcard.sh/companies/api/reference/wallet-withdrawal-recipients-list
            endpoint: '/api/v2/wallet/withdrawal-recipients',
            params: {
                user_id: input.user_id
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = OutputSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Agentcard API',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});
