import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe(
            'The unique identifier of the SharePoint site. Example: "nango.sharepoint.com,1d123d45-1234-12d4-1d34-12d1234d12d1,12d12345-12d1-12d4-12d4-12d1234d12d1"'
        ),
    driveId: z.string().describe('The unique identifier of the drive. Example: "b!1d123d4512d412d412d412d1234d12d1d12d1234d12d412d1234d12d12d12d"'),
    itemId: z.string().describe('The unique identifier of the drive item. Example: "0123456789ABC!123"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a file or folder from a site drive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-drive-item',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/driveitem-delete
        await nango.delete({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
