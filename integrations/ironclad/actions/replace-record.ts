import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    record_id: z.string().describe('Record ID to replace. Example: "c3ebdcb3-de93-43da-9067-2191c727d942"'),
    type: z.string().describe('Record type. Example: "everyFieldType"'),
    name: z.string().describe('Record name.'),
    properties: z.record(z.string(), z.unknown()).describe('Full typed properties object matching the record schema.')
});

const ProviderRecordSchema = z
    .object({
        id: z.string(),
        ironcladId: z.string().optional(),
        type: z.string(),
        name: z.string(),
        lastUpdated: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        attachments: z.record(z.string(), z.unknown()).optional(),
        links: z.array(z.unknown()).optional(),
        childIds: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = ProviderRecordSchema;

const action = createAction({
    description: "Replace a record's full properties object.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.updateRecords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ironcladapp.com/reference/public_api_v1_records_create-record
        const response = await nango.put({
            endpoint: `/public/api/v1/records/${encodeURIComponent(input.record_id)}`,
            data: {
                type: input.type,
                name: input.name,
                properties: input.properties
            },
            retries: 10
        });

        const providerRecord = ProviderRecordSchema.parse(response.data);
        return providerRecord;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
