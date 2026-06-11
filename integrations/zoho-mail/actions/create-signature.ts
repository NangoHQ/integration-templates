import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the signature. Example: "Work Signature"'),
    content: z.string().describe('Content of the signature. Example: "Best regards, John."'),
    position: z.number().int().describe('Position of the signature. 0 = below quoted content, 1 = above quoted content.'),
    assignUsers: z.string().optional().describe('Comma-separated email addresses to assign the signature to.')
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z.object({
        id: z.string(),
        name: z.string(),
        signatureType: z.string(),
        position: z.number(),
        content: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    signatureType: z.string(),
    position: z.number(),
    content: z.string()
});

const action = createAction({
    description: 'Add an email signature in Zoho Mail.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-signature',
        group: 'Signatures'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.CREATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.zoho.com/mail/help/api/add-user-signature.html
            endpoint: '/api/accounts/signature',
            data: {
                name: input.name,
                content: input.content,
                position: input.position,
                ...(input.assignUsers !== undefined && { assignUsers: input.assignUsers })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status.code !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerResponse.status.description,
                code: providerResponse.status.code
            });
        }

        return {
            id: providerResponse.data.id,
            name: providerResponse.data.name,
            signatureType: providerResponse.data.signatureType,
            position: providerResponse.data.position,
            content: providerResponse.data.content
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
