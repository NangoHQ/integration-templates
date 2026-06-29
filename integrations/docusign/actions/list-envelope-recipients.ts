import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('The DocuSign account ID from connection metadata.')
});

const RecipientSchema = z
    .object({
        recipientId: z.string().optional(),
        recipientIdGuid: z.string().optional(),
        name: z.string().optional(),
        email: z.string().optional(),
        routingOrder: z.string().optional(),
        status: z.string().optional(),
        deliveryMethod: z.string().optional(),
        completedCount: z.string().optional(),
        totalTabCount: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        signers: z.array(RecipientSchema).optional(),
        carbonCopies: z.array(RecipientSchema).optional(),
        certifiedDeliveries: z.array(RecipientSchema).optional(),
        inPersonSigners: z.array(RecipientSchema).optional(),
        agents: z.array(RecipientSchema).optional(),
        editors: z.array(RecipientSchema).optional(),
        intermediaries: z.array(RecipientSchema).optional(),
        seals: z.array(RecipientSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'List all recipients for an envelope.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-envelope-recipients'
    },
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const accountId = parsedMetadata.data.accountId;
        const envelopeId = input.envelopeId;

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/enveloperecipients/get/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(envelopeId)}/recipients`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Envelope recipients not found.',
                envelopeId
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
