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
    signers: z.array(RecipientUpdateSchema).optional().describe('Signers to update')
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

        await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
            data: {
                ...(input.signers !== undefined && { signers: input.signers })
            },
            retries: 1
        });

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
