import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountId: z.string().describe('The Zoho Mail account ID. Example: "4845214000000008002"'),
    folderId: z.string().describe('The ID of the folder to delete. Example: "4845214000000010002"')
});

const ZohoStatusSchema = z.object({
    code: z.number(),
    description: z.string()
});

const ProviderResponseSchema = z.object({
    status: ZohoStatusSchema,
    data: z.unknown().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    code: z.number(),
    description: z.string()
});

const action = createAction({
    description: 'Delete a folder and all its contents in Zoho Mail.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoMail.folders.ALL', 'ZohoMail.folders.DELETE'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/api/accounts/${encodeURIComponent(input.accountId)}/folders/${encodeURIComponent(input.folderId)}`;

        // https://www.zoho.com/mail/help/api/delete-folder.html
        const response = await nango.delete({
            endpoint: endpoint,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status.code !== 200) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Zoho Mail API returned error: ${providerResponse.status.description}`,
                code: providerResponse.status.code
            });
        }

        return {
            success: true,
            code: providerResponse.status.code,
            description: providerResponse.status.description
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
