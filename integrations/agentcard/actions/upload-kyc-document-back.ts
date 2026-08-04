import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    user_id: z.string(),
    image: z.string(),
    mime_type: z.string().optional(),
    document_type: z.enum(['drivers_license', 'state_id', 'passport']).optional(),
    issuing_country: z.string().optional()
});

const OutputSchema = z.object({
    object: z.enum(['kyc']).optional(),
    status: z.enum(['awaiting_documents', 'needs_information', 'requires_verification', 'pending', 'approved', 'rejected']).optional(),
    required_fields: z.array(z.string()).optional(),
    iframe_url: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    extracted: z.record(z.string(), z.string()).optional(),
    reason: z.string().optional()
});

const action = createAction({
    description: "Upload the back of a connected user's identity document for KYC verification.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://docs.agentcard.sh/api-reference/kyc/upload-document-back
        const response = await nango.post({
            endpoint: '/api/v2/kyc/documents/back',
            data: input,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Unexpected response shape from Agentcard upload-kyc-document-back endpoint.',
                errors: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export default action;
