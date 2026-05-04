import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table Name"'),
    fieldsToMergeOn: z.array(z.string()).describe('The fields to match on for upsert. Example: ["Name"]'),
    records: z
        .array(
            z.object({
                id: z.string().optional().describe('Optional record ID for direct updates.'),
                fields: z.record(z.string(), z.unknown()).describe('The field values for the record.')
            })
        )
        .describe('The records to upsert.'),
    typecast: z.boolean().optional().describe('Whether the API should attempt to automatically convert strings into the appropriate field types.'),
    returnFieldsByFieldId: z.boolean().optional().describe('Whether to return field values by field ID instead of field name.'),
    destructive: z.boolean().optional().describe('Whether to clear unspecified fields for updated records.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderRecordSchema),
    updatedRecords: z.array(z.string()),
    createdRecords: z.array(z.string())
});

const OutputSchema = z.object({
    records: z.array(
        z.object({
            id: z.string(),
            createdTime: z.string(),
            fields: z.record(z.string(), z.unknown())
        })
    ),
    updatedRecords: z.array(z.string()),
    createdRecords: z.array(z.string())
});

const action = createAction({
    description: 'Update or insert Airtable records using performUpsert match fields.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upsert-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            performUpsert: {
                fieldsToMergeOn: input.fieldsToMergeOn
            },
            records: input.records
        };

        if (input.typecast !== undefined) {
            data['typecast'] = input.typecast;
        }

        if (input.returnFieldsByFieldId !== undefined) {
            data['returnFieldsByFieldId'] = input.returnFieldsByFieldId;
        }

        if (input.destructive !== undefined) {
            data['destructive'] = input.destructive;
        }

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/update-multiple-records
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            data,
            retries: 3
        };

        const response = await nango.patch(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            records: providerResponse.records.map((record) => ({
                id: record.id,
                createdTime: record.createdTime,
                fields: record.fields
            })),
            updatedRecords: providerResponse.updatedRecords,
            createdRecords: providerResponse.createdRecords
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
