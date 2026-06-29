import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"')
});

const EnvelopeSchema = z
    .object({
        envelopeId: z.string(),
        status: z.string(),
        emailSubject: z.string().optional(),
        emailBlurb: z.string().optional(),
        sender: z
            .object({
                userName: z.string().optional(),
                userId: z.string().optional(),
                email: z.string().optional()
            })
            .passthrough()
            .optional(),
        sentDateTime: z.string().optional(),
        completedDateTime: z.string().optional(),
        createdDateTime: z.string().optional(),
        statusChangedDateTime: z.string().optional(),
        documentsUri: z.string().optional(),
        recipientsUri: z.string().optional(),
        attachmentsUri: z.string().optional(),
        envelopeUri: z.string().optional(),
        purgeState: z.string().optional(),
        voidedDateTime: z.string().optional(),
        voidedReason: z.string().optional(),
        expireDateTime: z.string().optional(),
        expireAfter: z.string().optional(),
        templateId: z.string().optional(),
        customFieldsUri: z.string().optional(),
        notificationUri: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    envelope: EnvelopeSchema
});

const MetadataSchema = z.object({
    accountId: z.string()
});

const action = createAction({
    description: "Retrieve a single envelope's metadata.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],
    endpoint: {
        path: '/actions/get-envelope',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/get/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Envelope not found or invalid response.',
                envelopeId: input.envelopeId
            });
        }

        const envelope = EnvelopeSchema.parse(response.data);

        return {
            envelope
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
