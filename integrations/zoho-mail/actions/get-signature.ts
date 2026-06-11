import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderSignatureSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    content: z.string().optional(),
    signatureType: z.string().optional(),
    position: z.number().optional(),
    contactId: z.string().optional()
});

const OutputSchema = z.object({
    signatures: z.array(ProviderSignatureSchema)
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const action = createAction({
    description: 'Retrieve all email signatures for the authenticated Zoho Mail account.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-signature',
        group: 'Signatures'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/mail/help/api/get-user-signature.html
            endpoint: '/api/accounts/signature',
            retries: 3
        };

        const response = await nango.get(config);

        const rawData: unknown = response.data;
        if (!isRecord(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Mail API'
            });
        }

        const signaturesData = rawData['data'];
        if (signaturesData === undefined || signaturesData === null) {
            return { signatures: [] };
        }

        let signatures: unknown[];
        if (Array.isArray(signaturesData)) {
            signatures = signaturesData;
        } else if (isRecord(signaturesData)) {
            signatures = [signaturesData];
        } else {
            signatures = [];
        }

        const parsedSignatures = signatures
            .map((item) => {
                const parsed = ProviderSignatureSchema.safeParse(item);
                if (parsed.success) {
                    return parsed.data;
                }
                return null;
            })
            .filter((item): item is z.infer<typeof ProviderSignatureSchema> => item !== null);

        return {
            signatures: parsedSignatures
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
