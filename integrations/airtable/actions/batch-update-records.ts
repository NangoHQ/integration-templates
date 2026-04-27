import { z } from 'zod';
import { createAction } from 'nango';

const RecordFieldSchema = z.record(z.string(), z.unknown());

const RecordUpdateSchema = z.object({
    id: z.string().describe('The Airtable record ID. Example: "rec1234567890abcd"'),
    fields: RecordFieldSchema.describe('The fields to update for this record.')
});

const InputSchema = z.object({
    base_id: z.string().describe('The Airtable base ID. Example: "app1234567890abcd"'),
    table_id_or_name: z.string().describe('The table ID or table name.'),
    records: z.array(RecordUpdateSchema).max(10).describe('Array of records to update. Maximum 10 records per request.'),
    typecast: z.boolean().optional().describe('Whether to typecast the values. Default is false.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const OutputRecordSchema = z.object({
    id: z.string(),
    created_time: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    records: z.array(OutputRecordSchema)
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
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            records: Array<{ id: string; fields: Record<string, unknown> }>;
            typecast?: boolean;
        } = {
            records: input.records.map((record) => ({
                id: record.id,
                fields: record.fields
            }))
        };

        if (input.typecast !== undefined) {
            requestBody.typecast = input.typecast;
        }

        // https://airtable.com/developers/web/api/update-multiple-records
        const response = await nango.patch({
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            records: providerResponse.records.map((record) => ({
                id: record.id,
                ...(record.createdTime && { created_time: record.createdTime }),
                ...(record.fields && { fields: record.fields })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
