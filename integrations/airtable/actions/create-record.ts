import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "tblXXXXXXXXXXXXXX" or "Table 1"'),
    fields: z.record(z.string(), z.unknown()).describe('Field values keyed by field name or field ID.')
});

const ProviderFieldSchema = z.record(z.string(), z.unknown());

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: ProviderFieldSchema
});

const ProviderCreateResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
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
        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/create-records
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            data: {
                records: [
                    {
                        fields: input.fields
                    }
                ]
            },
            retries: 10
        };

        const response = await nango.post(config);

        const parsed = ProviderCreateResponseSchema.parse(response.data);
        const record = parsed.records[0];

        if (!record) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Airtable returned an empty records array.'
            });
        }

        return {
            id: record.id,
            createdTime: record.createdTime,
            fields: record.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
