import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the workbook. Example: "b!abc123"'),
    itemId: z.string().describe('Workbook file item ID. Example: "01RFYLAYBTFQ2CLBMYRNEJOWXIFFJQOYW2"'),
    name: z.string().describe('Defined name to delete. Example: "DryrunDeleteTestName"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    driveId: z.string(),
    itemId: z.string(),
    name: z.string()
});

const action = createAction({
    description: 'Delete a workbook-level defined name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/resources/workbooknameditem
        const response = await nango.delete({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/names('${encodeURIComponent(input.name)}')`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, but received ${response.status}`,
                driveId: input.driveId,
                itemId: input.itemId,
                name: input.name
            });
        }

        return {
            success: true,
            driveId: input.driveId,
            itemId: input.itemId,
            name: input.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
