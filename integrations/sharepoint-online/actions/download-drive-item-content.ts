import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,site-id"'),
    driveId: z.string().describe('Drive ID. Example: "drive-id"'),
    itemId: z.string().describe('Drive item ID. Example: "item-id"')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded file content'),
    size: z.number().describe('File size in bytes'),
    mimeType: z.string().optional().describe('MIME type of the file')
});

const action = createAction({
    description: 'Download the file content of a SharePoint drive item',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-get-content
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
            retries: 3,
            responseType: 'arraybuffer'
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive item not found',
                siteId: input.siteId,
                driveId: input.driveId,
                itemId: input.itemId
            });
        }

        const buffer = Buffer.from(response.data);
        const content = buffer.toString('base64');
        const mimeType = response.headers['content-type'];

        return {
            content,
            size: buffer.length,
            ...(typeof mimeType === 'string' && mimeType.length > 0 && { mimeType })
        };
    }
});

export type NangoActionLocal = Parameters<typeof action.exec>[0];
export default action;
