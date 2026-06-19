import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    message_type: z.enum(['email', 'inapp']).describe('Type of message to send: "email" or "inapp".'),
    subject: z.string().optional().describe('Subject line for email messages. Required when message_type is "email".'),
    body: z.string().describe('The message body content (HTML supported).'),
    from: z
        .object({
            type: z.literal('admin'),
            id: z.string().describe('ID of the admin sending the message.')
        })
        .describe('The admin sending the message.'),
    to: z
        .object({
            type: z.enum(['contact', 'user']),
            id: z.string().describe('ID of the contact or user receiving the message.')
        })
        .describe('The recipient contact or user.'),
    template: z.string().optional().describe('Optional template name for the message.')
});

const ProviderMessageSchema = z.object({
    id: z.string(),
    type: z.string(),
    message_type: z.enum(['email', 'inapp']),
    subject: z.string().nullable().optional(),
    body: z.string().optional(),
    from: z
        .object({
            type: z.literal('admin'),
            id: z.string(),
            name: z.string().nullable().optional()
        })
        .passthrough()
        .optional(),
    to: z
        .object({
            type: z.string(),
            id: z.string()
        })
        .passthrough()
        .optional(),
    created_at: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    message_type: z.enum(['email', 'inapp']).optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    from: z
        .object({
            type: z.literal('admin'),
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    to: z
        .object({
            type: z.string(),
            id: z.string()
        })
        .optional(),
    created_at: z.number().optional()
});

const action = createAction({
    description: 'Send an outbound message to a contact.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['messages:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.message_type === 'email' && !input.subject) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Subject is required for email messages.'
            });
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Messages/createMessage
        const response = await nango.post({
            endpoint: '/messages',
            headers: {
                'Intercom-Version': '2.11',
                'Content-Type': 'application/json'
            },
            data: {
                message_type: input.message_type,
                ...(input.subject && { subject: input.subject }),
                body: input.body,
                from: input.from,
                to: input.to,
                ...(input.template && { template: input.template })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Intercom API.'
            });
        }

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            type: providerMessage.type,
            message_type: providerMessage.message_type,
            ...(providerMessage.subject != null && { subject: providerMessage.subject }),
            ...(providerMessage.body != null && { body: providerMessage.body }),
            ...(providerMessage.from && {
                from: {
                    type: providerMessage.from.type,
                    id: providerMessage.from.id,
                    ...(providerMessage.from.name != null && { name: providerMessage.from.name })
                }
            }),
            ...(providerMessage.to && {
                to: {
                    type: providerMessage.to.type,
                    id: providerMessage.to.id
                }
            }),
            ...(providerMessage.created_at != null && { created_at: providerMessage.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
