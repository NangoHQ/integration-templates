import { z } from 'zod';
import { createAction } from 'nango';

const RecipientUpdateSchema = z.object({
    recipientId: z.string().describe('Recipient ID. Example: "1"'),
    email: z.string().optional().describe('Updated email address'),
    name: z.string().optional().describe('Updated full name'),
    routingOrder: z.string().optional().describe('Updated routing order')
});

const InputSchema = z.object({
    envelopeId: z.string().describe('Envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    signers: z.array(RecipientUpdateSchema).min(1).describe('Signers to update')
});

const RecipientSchema = z.object({
    recipientId: z.string(),
    recipientIdGuid: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    routingOrder: z.string().optional(),
    status: z.string().optional(),
    deliveryMethod: z.string().optional(),
    note: z.string().optional()
});

const OutputSchema = z.object({
    signers: z.array(RecipientSchema).optional(),
    carbonCopies: z.array(RecipientSchema).optional(),
    editors: z.array(RecipientSchema).optional(),
    intermediaries: z.array(RecipientSchema).optional(),
    agents: z.array(RecipientSchema).optional(),
    certifiedDeliveries: z.array(RecipientSchema).optional(),
    inPersonSigners: z.array(RecipientSchema).optional()
});

const action = createAction({
    description: 'Update recipients on a draft envelope',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId =
            metadata && typeof metadata === 'object' && 'accountId' in metadata && typeof metadata['accountId'] === 'string'
                ? metadata['accountId']
                : undefined;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const PutResponseSchema = z
            .object({
                signers: z
                    .array(
                        z.object({
                            recipientId: z.string().optional(),
                            errorDetails: z.object({ errorCode: z.string(), message: z.string() }).optional()
                        })
                    )
                    .optional()
            })
            .passthrough();

        const putResponse = await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
            data: { signers: input.signers },
            retries: 1
        });

        if (putResponse.data) {
            const putResult = PutResponseSchema.safeParse(putResponse.data);
            if (putResult.success && putResult.data.signers) {
                const failed = putResult.data.signers.filter((s) => s.errorDetails?.errorCode);
                if (failed.length > 0) {
                    throw new nango.ActionError({
                        type: 'recipient_update_failed',
                        message: `Failed to update ${failed.length} recipient(s): ${failed.map((s) => s.errorDetails?.message).join(', ')}`
                    });
                }
            }
        }

        const getResponse = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/list/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'no_response',
                message: 'No response data received from DocuSign.'
            });
        }

        const result = OutputSchema.parse(getResponse.data);
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
