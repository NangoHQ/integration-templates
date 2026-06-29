import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"'),
    recipientId: z.string().describe('Recipient ID (integer string). Example: "1"'),
    email: z.string().email().describe('Recipient email address'),
    userName: z.string().describe('Recipient full name'),
    clientUserId: z.string().describe('Client user ID that was set when the recipient was added to the envelope'),
    returnUrl: z.string().describe('URL to redirect the recipient after signing. Example: "https://example.com/signed"'),
    authenticationMethod: z.string().optional().describe('Authentication method for the recipient. Default: "none"')
});

const ProviderResponseSchema = z
    .object({
        url: z.string(),
        recipientId: z.string().optional(),
        recipientIdGuid: z.string().optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().optional(),
        recipientSigningStatus: z.string().optional(),
        recipientMustSign: z.string().optional(),
        recipientRoleName: z.string().optional(),
        status: z.string().optional(),
        userName: z.string().optional(),
        email: z.string().optional(),
        clientUserId: z.string().optional(),
        embeddedRecipientStartURL: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    url: z.string(),
    recipientId: z.string().optional(),
    recipientIdGuid: z.string().optional(),
    recipientName: z.string().optional(),
    recipientEmail: z.string().optional(),
    recipientSigningStatus: z.string().optional(),
    recipientMustSign: z.string().optional(),
    recipientRoleName: z.string().optional(),
    status: z.string().optional(),
    userName: z.string().optional(),
    email: z.string().optional(),
    clientUserId: z.string().optional(),
    embeddedRecipientStartURL: z.string().optional()
});

const action = createAction({
    description: 'Generate an embedded signing URL for a recipient',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-recipient-view'
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

        const response = await nango.post({
            // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/views/recipient`,
            data: {
                returnUrl: input.returnUrl,
                authenticationMethod: input.authenticationMethod ?? 'none',
                email: input.email,
                userName: input.userName,
                recipientId: input.recipientId,
                clientUserId: input.clientUserId
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'DocuSign did not return a recipient view URL'
            });
        }

        const providerResult = ProviderResponseSchema.safeParse(response.data);
        if (!providerResult.success) {
            throw new nango.ActionError({
                type: 'missing_url',
                message: 'DocuSign response did not include a signing URL'
            });
        }
        const providerResponse = providerResult.data;

        return {
            url: providerResponse.url,
            ...(providerResponse.recipientId !== undefined && { recipientId: providerResponse.recipientId }),
            ...(providerResponse.recipientIdGuid !== undefined && { recipientIdGuid: providerResponse.recipientIdGuid }),
            ...(providerResponse.recipientName !== undefined && { recipientName: providerResponse.recipientName }),
            ...(providerResponse.recipientEmail !== undefined && { recipientEmail: providerResponse.recipientEmail }),
            ...(providerResponse.recipientSigningStatus !== undefined && { recipientSigningStatus: providerResponse.recipientSigningStatus }),
            ...(providerResponse.recipientMustSign !== undefined && { recipientMustSign: providerResponse.recipientMustSign }),
            ...(providerResponse.recipientRoleName !== undefined && { recipientRoleName: providerResponse.recipientRoleName }),
            ...(providerResponse.status !== undefined && { status: providerResponse.status }),
            ...(providerResponse.userName !== undefined && { userName: providerResponse.userName }),
            ...(providerResponse.email !== undefined && { email: providerResponse.email }),
            ...(providerResponse.clientUserId !== undefined && { clientUserId: providerResponse.clientUserId }),
            ...(providerResponse.embeddedRecipientStartURL !== undefined && { embeddedRecipientStartURL: providerResponse.embeddedRecipientStartURL })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
