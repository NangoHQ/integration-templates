import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,abcdef12-3456-7890-abcd-ef1234567890"'),
    listId: z.string().describe('SharePoint list ID. Example: "12345678-1234-1234-1234-123456789012"')
});

const OutputSchema = z.object({
    siteId: z.string(),
    listId: z.string()
});

const action = createAction({
    description: 'Delete a SharePoint list.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://learn.microsoft.com/graph/api/list-delete
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}`,
            retries: 3
        });

        return {
            siteId: input.siteId,
            listId: input.listId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
