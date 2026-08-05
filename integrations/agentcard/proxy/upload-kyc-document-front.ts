import { Nango } from '@nangohq/node';
import { z } from 'zod';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

const connectionId = process.env['AGENTCARD_CONNECTION_ID'] || 'agentcard';
const providerConfigKey = process.env['AGENTCARD_PROVIDER_CONFIG_KEY'] ?? 'agentcard';

const ProviderKycStateSchema = z.object({
    object: z.literal('kyc'),
    status: z.enum(['awaiting_documents', 'needs_information', 'requires_verification', 'pending', 'approved', 'rejected']),
    required_fields: z.array(z.string()).optional().nullable(),
    iframe_url: z.string().optional().nullable(),
    warnings: z.array(z.string()).optional().nullable(),
    extracted: z.record(z.string(), z.string()).optional().nullable(),
    reason: z.string().optional().nullable()
});

async function run(input: {
    user_id: string;
    image: string; // base64-encoded image bytes of the front of the identity document
    mime_type?: string;
    document_type?: 'drivers_license' | 'state_id' | 'passport';
    issuing_country?: string;
}) {
    const { user_id, image, mime_type, document_type, issuing_country } = input;

    // https://docs.agentcard.sh/companies/api/reference/kyc-upload-front
    const response = await nango.post({
        connectionId,
        providerConfigKey,
        endpoint: '/api/v2/kyc/documents/front',
        data: {
            user_id,
            image,
            ...(mime_type !== undefined && { mime_type }),
            ...(document_type !== undefined && { document_type }),
            ...(issuing_country !== undefined && { issuing_country })
        },
        retries: 3
    });

    return ProviderKycStateSchema.parse(response.data);
}

const input: Parameters<typeof run>[0] = {
    user_id: 'cmseows7p000fk604g3qee8bs',
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAAC0lEQVQYV2P4DwABAQEAWk1v8QAAAABJRU5ErkJggg==',
    mime_type: 'image/png',
    document_type: 'drivers_license',
    issuing_country: 'US'
};

nango.log(await run(input));
