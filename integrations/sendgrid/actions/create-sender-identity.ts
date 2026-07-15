import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    nickname: z.string().describe('Nickname for the sender identity. Example: "My Sender"'),
    from_email: z.string().email().describe('From email address. Example: "sender@example.com"'),
    from_name: z.string().describe('From name. Example: "Example Inc"'),
    reply_to: z.string().email().describe('Reply-to email address. Example: "reply@example.com"'),
    address: z.string().describe('Street address for CAN-SPAM compliance. Example: "123 Elm St"'),
    city: z.string().describe('City for CAN-SPAM compliance. Example: "Denver"'),
    state: z.string().describe('State for CAN-SPAM compliance. Example: "CO"'),
    zip: z.string().describe('ZIP code for CAN-SPAM compliance. Example: "80202"'),
    country: z.string().describe('Country for CAN-SPAM compliance. Example: "United States"')
});

const ProviderSenderSchema = z.object({
    id: z.number(),
    nickname: z.string(),
    from_email: z.string(),
    from_name: z.string().optional(),
    reply_to: z.string(),
    reply_to_name: z.string().optional(),
    address: z.string(),
    address2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string(),
    verified: z.boolean(),
    locked: z.boolean().optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    nickname: z.string(),
    from_email: z.string(),
    from_name: z.string().optional(),
    reply_to: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string(),
    verified: z.boolean()
});

const action = createAction({
    description: 'Create a sender identity (triggers a verification email).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/create-verified-sender-request
            endpoint: '/v3/verified_senders',
            data: {
                nickname: input.nickname,
                from_email: input.from_email,
                from_name: input.from_name,
                reply_to: input.reply_to,
                address: input.address,
                city: input.city,
                state: input.state,
                zip: input.zip,
                country: input.country
            },
            retries: 10
        });

        const providerSender = ProviderSenderSchema.parse(response.data);

        return {
            id: providerSender.id,
            nickname: providerSender.nickname,
            from_email: providerSender.from_email,
            ...(providerSender.from_name !== undefined && { from_name: providerSender.from_name }),
            reply_to: providerSender.reply_to,
            address: providerSender.address,
            city: providerSender.city,
            ...(providerSender.state !== undefined && { state: providerSender.state }),
            ...(providerSender.zip !== undefined && { zip: providerSender.zip }),
            country: providerSender.country,
            verified: providerSender.verified
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
