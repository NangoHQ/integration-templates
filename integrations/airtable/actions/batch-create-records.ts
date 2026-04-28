import { z } from 'zod';
import { createAction } from 'nango';

const RecordInputSchema = z.object({
    fields: z.record(z.string(), z.unknown()).describe('Field values for the record. Keys are field names or IDs.')
});

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "tblXXXXXXXXXXXXXX" or "My Table"'),
    records: z.array(RecordInputSchema).describe('Array of records to create. Maximum 10 records per request.'),
    typecast: z.boolean().optional().describe('If true, the Airtable API will perform best-effort automatic data conversion.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const OutputSchema = z.object({
    records: z.array(
        z.object({
            id: z.string(),
            createdTime: z.string(),
            fields: z.record(z.string(), z.unknown())
        })
    )
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
        const response = await nango.post({
            // https://airtable.com/developers/web/api/create-records
            endpoint: `/v0/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
            data: {
                records: input.records,
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 10
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
