import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Airtable table ID or name.'),
    recordId: z.string().describe('Airtable record ID. Example: "recXXXXXXXXXXXXXX"'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update on the record.'),
    typecast: z.boolean().optional().describe('Whether to allow typecasting of field values.')
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
    description: 'Update fields on a single Airtable record.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://airtable.com/developers/web/api/update-record
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            data: {
                fields: input.fields,
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 10
        });

        const record = ProviderRecordSchema.parse(response.data);

        return {
            id: record.id,
            createdTime: record.createdTime,
            fields: record.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
