import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('The connected user ID. Example: "cmseows7p000fk604g3qee8bs"'),
    image: z.string().describe('Base64-encoded image bytes of the front of the identity document'),
    mime_type: z.string().optional().describe('MIME type of the uploaded image. Defaults to image/jpeg'),
    document_type: z.enum(['drivers_license', 'state_id', 'passport']).optional().describe('Type of identity document. Auto-detected if omitted'),
    issuing_country: z.string().optional().describe('Optional ISO 3166-1 country code of the issuing country. Defaults to US')
});

const ProviderKycStateSchema = z.object({
    object: z.literal('kyc'),
    status: z.enum(['awaiting_documents', 'needs_information', 'requires_verification', 'pending', 'approved', 'rejected']),
    required_fields: z.array(z.string()).optional().nullable(),
    iframe_url: z.string().optional().nullable(),
    warnings: z.array(z.string()).optional().nullable(),
    extracted: z.record(z.string(), z.string()).optional().nullable(),
    reason: z.string().optional().nullable()
});

const OutputSchema = z.object({
    object: z.literal('kyc'),
    status: z.enum(['awaiting_documents', 'needs_information', 'requires_verification', 'pending', 'approved', 'rejected']),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional(),
    reason: z.string().optional()
});

const action = createAction({
    description: "Upload the front of a connected user's identity document for KYC verification",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.agentcard.sh/companies/api/reference/kyc-upload-front.md
            endpoint: '/api/v2/kyc/documents/front',
            data: {
                user_id: input.user_id,
                image: input.image,
                ...(input.mime_type !== undefined && { mime_type: input.mime_type }),
                ...(input.document_type !== undefined && { document_type: input.document_type }),
                ...(input.issuing_country !== undefined && { issuing_country: input.issuing_country })
            },
            retries: 3
        });

        const providerResponse = ProviderKycStateSchema.parse(response.data);

        return {
            object: providerResponse.object,
            status: providerResponse.status,
            ...(providerResponse.required_fields != null && { required_fields: providerResponse.required_fields }),
            ...(providerResponse.iframe_url != null && { iframe_url: providerResponse.iframe_url }),
            ...(providerResponse.warnings != null && { warnings: providerResponse.warnings }),
            ...(providerResponse.extracted != null && { extracted: providerResponse.extracted }),
            ...(providerResponse.reason != null && { reason: providerResponse.reason })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
