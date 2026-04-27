import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table 1"'),
    recordId: z.string().describe('The ID of the record to replace. Example: "recXXXXXXXXXXXXXX"'),
    fields: z.record(z.string(), z.unknown()).describe('The fields to set on the record.'),
    typecast: z.boolean().optional().describe('If true, Airtable will attempt to convert strings to appropriate types.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Replace a single Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/replace-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://airtable.com/developers/web/api/update-record
            endpoint: `/v0/${encodeURIComponent(input.baseId)}/${encodeURIComponent(input.tableIdOrName)}/${encodeURIComponent(input.recordId)}`,
            data: {
                fields: input.fields,
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 1
        });

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            createdTime: providerRecord.createdTime,
            fields: providerRecord.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
