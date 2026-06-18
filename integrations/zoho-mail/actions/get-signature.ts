import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderSignatureSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    content: z.string().optional(),
    signatureType: z.string().optional(),
    position: z.number().optional(),
    contactId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional()
});

const OutputSchema = z.object({
    signatures: z.array(ProviderSignatureSchema)
});

const action = createAction({
    description: 'Retrieve all email signatures for the authenticated Zoho Mail account.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/mail/help/api/get-user-signature.html
            endpoint: '/api/accounts/signature',
            retries: 3
        });

        const envelope = ProviderResponseSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Mail API'
            });
        }

        if (envelope.data.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.status.description,
                code: envelope.data.status.code
            });
        }

        const signaturesData = envelope.data.data;
        if (signaturesData === undefined || signaturesData === null) {
            return { signatures: [] };
        }

        const rawItems = Array.isArray(signaturesData) ? signaturesData : [signaturesData];

        const parsedSignatures = rawItems
            .map((item) => {
                const parsed = ProviderSignatureSchema.safeParse(item);
                return parsed.success ? parsed.data : null;
            })
            .filter((item): item is z.infer<typeof ProviderSignatureSchema> => item !== null);

        return {
            signatures: parsedSignatures
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
