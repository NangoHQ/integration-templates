import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tbl1234567890abcd" or "Projects"'),
    recordId: z.string().describe('The ID of the record to delete. Example: "rec1234567890abcd"')
});

const OutputSchema = z.object({
    deleted: z.boolean().describe('Whether the record was successfully deleted'),
    id: z.string().describe('The ID of the deleted record')
});

const action = createAction({
    description: 'Delete a single Airtable record by record ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-record'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/delete-record
        const response = await nango.delete({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            retries: 3
        });

        // Airtable delete response: { deleted: true, id: "rec1234567890abcd" }
        const data = response.data;
        if (data === null || typeof data !== 'object' || !('deleted' in data) || data.deleted !== true || !('id' in data) || typeof data.id !== 'string') {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: 'Failed to delete record or unexpected response from Airtable',
                baseId: input.baseId,
                tableIdOrName: input.tableIdOrName,
                recordId: input.recordId
            });
        }

        const recordId = data.id;
        return {
            deleted: true,
            id: recordId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
