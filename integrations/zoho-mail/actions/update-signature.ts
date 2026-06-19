import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the signature to update. Example: "2442552000000433009"'),
    name: z.string().describe('The updated name of the signature.'),
    content: z.string().describe('The updated content of the signature.'),
    position: z.number().int().describe('The preferred position of the signature. 0 = below quoted content, 1 = above quoted content.'),
    assignUsers: z.string().optional().describe('Comma-separated email addresses to assign this signature to.'),
    unassignUsers: z.string().optional().describe('Comma-separated email addresses to unassign this signature from.')
});

const ProviderResponseSchema = z.object({
    status: z.object({
        code: z.number(),
        description: z.string()
    }),
    data: z.object({
        name: z.string(),
        signatureType: z.string(),
        id: z.string(),
        position: z.number(),
        content: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    content: z.string(),
    position: z.number(),
    signatureType: z.string()
});

const action = createAction({
    description: 'Update an email signature in Zoho Mail.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.accounts.UPDATE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://www.zoho.com/mail/help/api/update-user-signature.html
            endpoint: '/api/accounts/signature',
            data: {
                id: input.id,
                name: input.name,
                content: input.content,
                position: input.position,
                ...(input.assignUsers !== undefined && { assignUsers: input.assignUsers }),
                ...(input.unassignUsers !== undefined && { unassignUsers: input.unassignUsers })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const signature = providerResponse.data;

        return {
            id: signature.id,
            name: signature.name,
            content: signature.content,
            position: signature.position,
            signatureType: signature.signatureType
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
