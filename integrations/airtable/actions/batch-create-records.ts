import { z } from 'zod';
import { createAction } from 'nango';

const RecordInputSchema = z
    .object({
        fields: z.record(z.string(), z.unknown()).describe('A mapping of field IDs or names to field values.')
    })
    .describe('A record to create with its field values.');

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table Name"'),
    records: z.array(RecordInputSchema).describe('Array of records to create. Each record should have a `fields` object containing the field values.'),
    typecast: z.boolean().optional().describe('If true, Airtable will attempt to convert cell values to the appropriate type.')
});

const ProviderFieldSchema = z.object({}).passthrough().describe('The field values of the record, keyed by field name or ID.');

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: ProviderFieldSchema
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const CreatedRecordSchema = z.object({
    id: z.string().describe('The unique identifier of the created record.'),
    createdTime: z.string().describe('The timestamp when the record was created.'),
    fields: z.record(z.string(), z.unknown()).describe('The field values of the created record.')
});

const OutputSchema = z.object({
    records: z.array(CreatedRecordSchema).describe('Array of created records with their IDs and field values.')
});

const action = createAction({
    description: 'Create multiple Airtable records in one request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-create-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/create-records
        const response = await nango.post({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            data: {
                records: input.records,
                typecast: input.typecast ?? false
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            records: providerResponse.records.map((record) => ({
                id: record.id,
                createdTime: record.createdTime,
                fields: record.fields
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
