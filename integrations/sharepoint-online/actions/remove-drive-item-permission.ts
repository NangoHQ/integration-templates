import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('The ID of the SharePoint site. Example: "contoso.sharepoint.com,1bc25372-6eb2-4c3c-8237-809c7c4b2800,2e1554b0-6b7f-4e52-85ff-725d9f9a9c6e"'),
    driveId: z.string().describe('The ID of the drive. Example: "b!yX8juNup80KqhYTKaqNlebaaLNrjw1VNhQ0el-3iEoQAiQ9Qf7W1Q5g"'),
    itemId: z.string().describe('The ID of the drive item. Example: "01X2JKGDJW5WBDKAXEFREIJSKIQATQZ5VE"'),
    permissionId: z.string().describe('The ID of the permission to remove. Example: "1"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a permission from a drive item.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/graph/api/permission-delete
        await nango.delete({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
