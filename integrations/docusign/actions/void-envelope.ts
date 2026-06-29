import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID to void. Example: "4ee72f9d-d6f6-8cfd-81e1-9bdea266189e"'),
    voidedReason: z.string().optional().describe('Reason for voiding the envelope. Defaults to "Voided by user" if not provided.')
});

const OutputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID that was voided.'),
    status: z.string().describe('The updated envelope status.'),
    statusDateTime: z.string().optional().describe('The date and time the status was updated.'),
    voidedReason: z.string().optional().describe('The reason the envelope was voided.')
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const VoidEnvelopeResponseSchema = z
    .object({
        envelopeId: z.string().optional(),
        status: z.string().optional(),
        statusDateTime: z.string().optional(),
        voidedReason: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Void a sent envelope that has not yet been completed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    endpoint: {
        method: 'POST',
        path: '/actions/void-envelope'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const rawMetadata = await nango.getMetadata<Record<string, unknown>>();
        const metadata = MetadataSchema.parse(rawMetadata ?? {});
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.put({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/update/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}`,
            data: {
                status: 'voided',
                voidedReason: input.voidedReason ?? 'Voided by user'
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Invalid or empty response from DocuSign API.'
            });
        }

        const envelope = VoidEnvelopeResponseSchema.parse(rawData);

        return {
            envelopeId: envelope.envelopeId ?? input.envelopeId,
            status: envelope.status ?? 'voided',
            ...(envelope.statusDateTime !== undefined && envelope.statusDateTime !== null && { statusDateTime: envelope.statusDateTime }),
            ...(envelope.voidedReason !== undefined && envelope.voidedReason !== null && { voidedReason: envelope.voidedReason })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
