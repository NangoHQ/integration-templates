import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appJxrbEgLaF00M2f"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblNPITrPesLLh2eA"'),
    records: z
        .array(
            z.object({
                id: z.string().describe('The record ID to replace. Example: "recslM5i7emIT0Mn9"'),
                fields: z.record(z.string(), z.unknown()).describe('Field values to set on the record.')
            })
        )
        .describe('Array of records to replace.'),
    typecast: z.boolean().optional().describe('If true, Airtable will coerce data types.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema)
});

const OutputRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    records: z.array(OutputRecordSchema)
});

const action = createAction({
    description: 'Replace multiple Airtable records in one request.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-replace-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

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

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            records: providerResponse.records.map((record) => ({
                id: record.id,
                ...(record.createdTime !== undefined && { createdTime: record.createdTime }),
                ...(record.fields !== undefined && { fields: record.fields })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
