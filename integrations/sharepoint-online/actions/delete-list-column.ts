import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,abcdef12-3456-7890-abcd-ef1234567890"'),
    listId: z.string().describe('SharePoint list ID. Example: "12345678-1234-1234-1234-123456789012"'),
    columnId: z.string().describe('SharePoint column definition ID. Example: "12345678-1234-1234-1234-123456789012"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a column from a SharePoint list.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-list-column',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/columndefinition-delete
        await nango.delete({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/columns/${encodeURIComponent(input.columnId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
