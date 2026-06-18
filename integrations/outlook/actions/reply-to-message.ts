import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    messageId: z.string().describe('The ID of the message to reply to. Example: "AAMkAGVmMDEZ..."'),
    comment: z.string().describe('The plain text body of the reply message. Example: "Thank you for your email. I will get back to you soon."')
});

const ProviderMessageSchema = z
    .object({
        id: z.string(),
        subject: z.string().nullable().optional(),
        body: z
            .object({
                contentType: z.string().optional(),
                content: z.string().nullable().optional()
            })
            .passthrough()
            .optional(),
        sender: z
            .object({
                emailAddress: z
                    .object({
                        address: z.string().optional(),
                        name: z.string().optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .optional(),
        toRecipients: z
            .array(
                z
                    .object({
                        emailAddress: z
                            .object({
                                address: z.string().optional(),
                                name: z.string().optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
            )
            .optional(),
        createdDateTime: z.string().nullable().optional(),
        sentDateTime: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    messageId: z.string(),
    success: z.boolean(),
    subject: z.string().optional(),
    body: z
        .object({
            contentType: z.string().optional(),
            content: z.string().optional()
        })
        .optional(),
    sender: z
        .object({
            emailAddress: z
                .object({
                    address: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    toRecipients: z
        .array(
            z.object({
                emailAddress: z
                    .object({
                        address: z.string().optional(),
                        name: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    createdDateTime: z.string().optional(),
    sentDateTime: z.string().optional()
});

const action = createAction({
    description: 'Reply to a message sender.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Mail.Send', 'Mail.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/message-reply
        const response = await nango.post({
            endpoint: `/v1.0/me/messages/${encodeURIComponent(input.messageId)}/reply`,
            data: {
                comment: input.comment
            },
            retries: 3
        });

        // The reply endpoint returns 202 Accepted with no body on success
        if (response.status === 202 || response.status === 200) {
            if (!response.data || Object.keys(response.data).length === 0) {
                return {
                    messageId: input.messageId,
                    success: true
                };
            }
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'reply_failed',
                message: 'Failed to send reply message'
            });
        }

        const providerMessage = ProviderMessageSchema.parse(response.data);

        return {
            id: providerMessage.id,
            messageId: input.messageId,
            success: true,
            ...(providerMessage.subject != null && { subject: providerMessage.subject }),
            ...(providerMessage.body != null && {
                body: {
                    ...(providerMessage.body.contentType != null && { contentType: providerMessage.body.contentType }),
                    ...(providerMessage.body.content != null && { content: providerMessage.body.content })
                }
            }),
            ...(providerMessage.sender != null && {
                sender: {
                    ...(providerMessage.sender.emailAddress != null && {
                        emailAddress: {
                            ...(providerMessage.sender.emailAddress.address != null && { address: providerMessage.sender.emailAddress.address }),
                            ...(providerMessage.sender.emailAddress.name != null && { name: providerMessage.sender.emailAddress.name })
                        }
                    })
                }
            }),
            ...(providerMessage.toRecipients != null && {
                toRecipients: providerMessage.toRecipients.map((recipient) => ({
                    ...(recipient.emailAddress != null && {
                        emailAddress: {
                            ...(recipient.emailAddress.address != null && { address: recipient.emailAddress.address }),
                            ...(recipient.emailAddress.name != null && { name: recipient.emailAddress.name })
                        }
                    })
                }))
            }),
            ...(providerMessage.createdDateTime != null && { createdDateTime: providerMessage.createdDateTime }),
            ...(providerMessage.sentDateTime != null && { sentDateTime: providerMessage.sentDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
