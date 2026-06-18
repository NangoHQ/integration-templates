import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "nangodevelopers.sharepoint.com,ff9cef8d-d0e4-4638-a6a6-d5374e2b31e1,d12a8199-c77a-4e48-a193-2e1288b26f13"'),
    listId: z.string().describe('SharePoint list ID. Example: "dde98b6f-30e5-4c2f-91ba-2939b1e8c9b4"'),
    fields: z.record(z.string(), z.unknown()).describe('Field values that match the list schema.')
});

const IdentitySchema = z.object({
    user: z
        .object({
            displayName: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    createdBy: IdentitySchema.optional(),
    lastModifiedDateTime: z.string().optional(),
    lastModifiedBy: IdentitySchema.optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create an item in a SharePoint list.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://learn.microsoft.com/graph/api/listitem-create
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items`,
            data: {
                fields: input.fields
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
