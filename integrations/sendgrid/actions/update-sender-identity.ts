import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const VerifiedSenderResponseSchema = z.object({
    id: z.number(),
    nickname: z.string(),
    from_email: z.string(),
    from_name: z.string().optional(),
    reply_to: z.string(),
    reply_to_name: z.string().optional(),
    address: z.string(),
    address2: z.string().optional(),
    state: z.string().optional(),
    city: z.string(),
    zip: z.string().optional(),
    country: z.string(),
    verified: z.boolean(),
    locked: z.boolean().optional()
});

const ListResponseSchema = z.object({
    results: z.array(VerifiedSenderResponseSchema)
});

const InputSchema = z.object({
    sender_id: z.number().describe('The ID of the sender identity to update. Example: 9389986'),
    nickname: z.string().optional(),
    from_email: z.string().optional(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    reply_to_name: z.string().optional(),
    address: z.string().optional(),
    address2: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional()
});

const OutputSchema = VerifiedSenderResponseSchema;

const action = createAction({
    description: "Update a sender identity's details.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['mail.send', 'sender_verification'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const listConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/get-all-verified-senders
            endpoint: '/v3/verified_senders',
            params: {
                id: input.sender_id
            },
            retries: 3
        };
        const listResponse = await nango.get(listConfig);

        const listData = ListResponseSchema.parse(listResponse.data);
        const current = listData.results.find((sender) => sender.id === input.sender_id);

        if (!current) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Sender identity with id ${input.sender_id} not found.`
            });
        }

        const payload = {
            nickname: input.nickname !== undefined ? input.nickname : current.nickname,
            from_email: input.from_email !== undefined ? input.from_email : current.from_email,
            from_name: input.from_name !== undefined ? input.from_name : current.from_name,
            reply_to: input.reply_to !== undefined ? input.reply_to : current.reply_to,
            reply_to_name: input.reply_to_name !== undefined ? input.reply_to_name : current.reply_to_name,
            address: input.address !== undefined ? input.address : current.address,
            address2: input.address2 !== undefined ? input.address2 : current.address2,
            state: input.state !== undefined ? input.state : current.state,
            city: input.city !== undefined ? input.city : current.city,
            zip: input.zip !== undefined ? input.zip : current.zip,
            country: input.country !== undefined ? input.country : current.country
        };

        const patchConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/edit-verified-sender
            endpoint: `/v3/verified_senders/${encodeURIComponent(String(input.sender_id))}`,
            data: payload,
            retries: 10
        };
        const patchResponse = await nango.patch(patchConfig);

        return VerifiedSenderResponseSchema.parse(patchResponse.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
