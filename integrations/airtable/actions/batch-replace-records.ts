import { z } from 'zod';
import { createAction } from 'nango';

const RecordFieldSchema = z.record(z.string(), z.unknown()).describe('Field values keyed by field name or field ID');

const RecordInputSchema = z.object({
    id: z.string().describe('Airtable record ID. Example: "rec123abc456"'),
    fields: RecordFieldSchema.describe('The field values for this record')
});

const RecordOutputSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: RecordFieldSchema
});

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "app123abc456"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "My Table" or "tbl123abc456"'),
    records: z.array(RecordInputSchema).max(10).describe('Array of records to replace (max 10 records per request)'),
    typecast: z.boolean().optional().describe('If true, allows Airtable to coerce field values to the correct type')
});

const OutputSchema = z.object({
    records: z.array(RecordOutputSchema)
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const action = createAction({
    description: 'Replace multiple Airtable records in one request',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-replace-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/update-multiple-records
        const response = await nango.put({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            data: {
                records: input.records,
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            records: providerData.records.map((record) => ({
                id: record.id,
                createdTime: record.createdTime,
                fields: record.fields
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
