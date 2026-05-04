import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "app1234567890abcd"'),
    tableIdOrName: z.string().describe('Airtable table ID or name. Example: "tbl1234567890abcd" or "Tasks"'),
    recordIds: z.array(z.string()).min(1).max(10).describe('Array of record IDs to delete. Minimum 1, maximum 10. Example: ["rec1234567890abcd"]')
});

const DeletedRecordSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const ProviderResponseSchema = z.object({
    records: z.array(DeletedRecordSchema)
});

const OutputSchema = z.object({
    records: z.array(DeletedRecordSchema)
});

const action = createAction({
    description: 'Delete multiple Airtable records by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-delete-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParams = input.recordIds.map((recordId) => `records[]=${encodeURIComponent(recordId)}`).join('&');

        const response = await nango.delete({
            // https://airtable.com/developers/web/api/delete-multiple-records
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            params: queryParams,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Airtable returned an empty response.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            records: parsed.records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
