import { z } from 'zod';
import { createAction } from 'nango';

const DocumentInputSchema = z.object({
    documentBase64: z.string().describe('Base64-encoded document content. Example: "JVBERi0xLjQ..."'),
    name: z.string().describe('Document name. Example: "Contract.pdf"'),
    documentId: z.string().describe('Unique document ID within the envelope. Example: "1"'),
    fileExtension: z.string().describe('File extension. Example: "pdf"')
});

const SignerInputSchema = z.object({
    email: z.string().describe('Signer email address. Example: "signer@example.com"'),
    name: z.string().describe('Signer name. Example: "John Doe"'),
    recipientId: z.string().describe('Unique recipient ID within the envelope. Example: "1"'),
    routingOrder: z.string().optional().describe('Signing order. Example: "1"')
});

const CarbonCopyInputSchema = z.object({
    email: z.string().describe('CC recipient email address. Example: "cc@example.com"'),
    name: z.string().describe('CC recipient name. Example: "Jane Doe"'),
    recipientId: z.string().describe('Unique recipient ID within the envelope. Example: "2"'),
    routingOrder: z.string().optional().describe('Routing order. Example: "1"')
});

const InputSchema = z.object({
    status: z.enum(['created', 'sent']).optional().describe('Envelope status: created (draft) or sent (immediately). Example: "created"'),
    emailSubject: z.string().optional().describe('Email subject line. Example: "Please sign this document"'),
    emailBlurb: z.string().optional().describe('Email message body. Example: "Please review and sign the attached document"'),
    documents: z.array(DocumentInputSchema).optional().describe('Documents to include in the envelope'),
    recipients: z
        .object({
            signers: z.array(SignerInputSchema).optional().describe('Signers'),
            carbonCopies: z.array(CarbonCopyInputSchema).optional().describe('Carbon copy recipients')
        })
        .optional()
        .describe('Envelope recipients')
});

const ProviderEnvelopeSchema = z.object({
    envelopeId: z.string(),
    status: z.string().optional(),
    statusDateTime: z.string().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    envelopeId: z.string().describe('Created envelope ID. Example: "550e8400-e29b-41d4-a716-446655440000"'),
    status: z.string().optional().describe('Envelope status. Example: "created"'),
    statusDateTime: z.string().optional().describe('Status update timestamp. Example: "2026-06-24T12:00:00.000Z"'),
    uri: z.string().optional().describe('Envelope URI. Example: "/envelopes/550e8400-e29b-41d4-a716-446655440000"')
});

const MetadataSchema = z.object({
    accountId: z.string().describe('DocuSign account ID. Example: "96bfbc88-de80-40a4-9fb7-f047e656eaaf"')
});

const action = createAction({
    description: 'Create or send an envelope with documents and recipients',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const body: Record<string, unknown> = {
            status: input.status ?? 'created'
        };

        if (input.emailSubject !== undefined) {
            body['emailSubject'] = input.emailSubject;
        }

        if (input.emailBlurb !== undefined) {
            body['emailBlurb'] = input.emailBlurb;
        }

        if (input.documents !== undefined && input.documents.length > 0) {
            body['documents'] = input.documents;
        }

        if (input.recipients !== undefined) {
            const recipients: Record<string, unknown> = {};

            if (input.recipients.signers !== undefined && input.recipients.signers.length > 0) {
                recipients['signers'] = input.recipients.signers;
            }

            if (input.recipients.carbonCopies !== undefined && input.recipients.carbonCopies.length > 0) {
                recipients['carbonCopies'] = input.recipients.carbonCopies;
            }

            if (Object.keys(recipients).length > 0) {
                body['recipients'] = recipients;
            }
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/create/
        const response = await nango.post({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes`,
            data: body,
            retries: 3
        });

        const providerEnvelope = ProviderEnvelopeSchema.parse(response.data);

        return {
            envelopeId: providerEnvelope.envelopeId,
            ...(providerEnvelope.status !== undefined && { status: providerEnvelope.status }),
            ...(providerEnvelope.statusDateTime !== undefined && { statusDateTime: providerEnvelope.statusDateTime }),
            ...(providerEnvelope.uri !== undefined && { uri: providerEnvelope.uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
