import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    base_id: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    table_id_or_name: z.string().describe('The table ID or name. Example: "tblXXXXXXXXXXXXXX" or "Table Name"'),
    fields: z.record(z.string(), z.unknown()).describe('The field values for the new record. Keys are field names or IDs.')
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
    id: z.string(),
    created_time: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const action = createAction({
    description: 'Create a single Airtable record in a table.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/create-records
        const response = await nango.post({
            endpoint: `/v0/${input.base_id}/${input.table_id_or_name}`,
            data: {
                records: [
                    {
                        fields: input.fields
                    }
                ]
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const record = providerResponse.records[0];

        if (!record) {
            throw new nango.ActionError({
                type: 'no_record_returned',
                message: 'No record was returned from Airtable'
            });
        }

        return {
            id: record.id,
            created_time: record.createdTime,
            fields: record.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
