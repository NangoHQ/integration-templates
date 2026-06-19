import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,12345678-1234-1234-1234-123456789012,abcdef12-3456-7890-abcd-ef1234567890"'),
    contentTypeId: z.string().describe('SharePoint content type ID. Example: "0x0101009D1CB325DA4B6BDA4F5C51B469A07A12"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a content type from a SharePoint site.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/contenttype-delete
        await nango.delete({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/contentTypes/${encodeURIComponent(input.contentTypeId)}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
