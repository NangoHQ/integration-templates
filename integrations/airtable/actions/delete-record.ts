import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Airtable table ID or name. Example: "tblXXXXXXXXXXXXXX" or "Table Name"'),
    recordId: z.string().describe('Airtable record ID. Example: "recXXXXXXXXXXXXXX"')
});

const ProviderDeleteResponseSchema = z.object({
    deleted: z.boolean(),
    id: z.string()
});

const OutputSchema = z.object({
    deleted: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete a single Airtable record by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://airtable.com/developers/web/api/delete-record
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            retries: 1
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            deleted: providerResponse.deleted,
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
