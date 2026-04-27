import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable Base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "tblXXXXXXXXXXXXXX" or "Table 1"'),
    recordId: z.string().describe('Record ID to update. Example: "recXXXXXXXXXXXXXX"'),
    fields: z.record(z.string(), z.unknown()),
    typecast: z.boolean().optional().describe('If true, Airtable will try to convert values to the appropriate type')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    id: z.string(),
    createdTime: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Update fields on a single Airtable record',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/update-record
        const response = await nango.patch({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            data: {
                fields: input.fields,
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 3
        });

        const record = ProviderRecordSchema.parse(response.data);

        return {
            id: record.id,
            ...(record.createdTime && { createdTime: record.createdTime }),
            ...(record.fields && { fields: record.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
