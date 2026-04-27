import { z } from 'zod';
import { createAction } from 'nango';

const RecordInputSchema = z.object({
    id: z.string().describe('Record ID. Example: "rec1234567890abcdef"'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update for this record.')
});

const InputSchema = z.object({
    base_id: z.string().describe('Base ID. Example: "app1234567890abcdef"'),
    table_id_or_name: z.string().describe('Table ID or name. Example: "tbl1234567890abcdef" or "My Table"'),
    records: z.array(RecordInputSchema).describe('Array of records to update.'),
    typecast: z.boolean().optional().describe('If true, Airtable will attempt to convert values to the appropriate field type.')
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
            created_time: z.string().optional(),
            fields: z.record(z.string(), z.unknown()).optional()
        })
    )
});

const action = createAction({
    description: 'Update multiple Airtable records in one request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-update-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/update-multiple-records
        const response = await nango.patch({
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}`,
            data: {
                records: input.records.map((record) => ({
                    id: record.id,
                    fields: record.fields
                })),
                ...(input.typecast !== undefined && { typecast: input.typecast })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            records: providerResponse.records.map((record) => ({
                id: record.id,
                ...(record.createdTime !== undefined && { created_time: record.createdTime }),
                ...(record.fields !== undefined && { fields: record.fields })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
