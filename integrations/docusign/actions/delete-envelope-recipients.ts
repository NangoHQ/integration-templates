import { z } from 'zod';
import { createAction } from 'nango';

const RecipientSchema = z.object({
    recipientId: z.string().describe('The recipient ID to delete. Example: "1"')
});

const InputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    recipients: z.array(RecipientSchema).describe('Array of recipients to remove from the envelope')
});

const DeletedRecipientSchema = z.object({
    recipientId: z.string()
});

const OutputSchema = z.object({
    envelopeId: z.string(),
    deletedRecipients: z.array(DeletedRecipientSchema)
});

const action = createAction({
    description: 'Remove recipients from a draft envelope.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-envelope-recipients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/delete/
        await nango.delete({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
            data: {
                signers: input.recipients.map((recipient) => ({
                    recipientId: recipient.recipientId
                }))
            },
            retries: 3
        });

        return {
            envelopeId: input.envelopeId,
            deletedRecipients: input.recipients.map((recipient) => ({
                recipientId: recipient.recipientId
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
