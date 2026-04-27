import { z } from 'zod';
import { createAction } from 'nango';

const RecordFieldSchema = z.record(z.string(), z.unknown());

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tbl9876543210efgh" or "Tasks"'),
    fieldsToMergeOn: z
        .array(z.string())
        .describe('Field names to match on for upsert. Records matching on these fields will be updated; non-matching records will be created.'),
    records: z
        .array(
            z.object({
                id: z.string().optional().describe('Record ID. Required if updating an existing record by ID instead of using fieldsToMergeOn matching.'),
                fields: RecordFieldSchema.describe('The field values for the record. Keys are field names or field IDs.')
            })
        )
        .describe('Records to upsert (update or create).'),
    typecast: z.boolean().optional().describe('If true, Airtable will perform typecasting on the data. Default: false.')
});

const AirtableRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const ProviderResponseSchema = z.object({
    records: z.array(AirtableRecordSchema),
    updatedRecords: z.array(z.string()).optional(),
    createdRecords: z.array(z.string()).optional()
});

const UpsertedRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown()),
    operation: z.enum(['created', 'updated']).describe('Whether the record was created or updated.')
});

const OutputSchema = z.object({
    records: z.array(UpsertedRecordSchema).describe('The upserted records with their operation status.'),
    updatedRecordIds: z.array(z.string()).optional().describe('IDs of records that were updated.'),
    createdRecordIds: z.array(z.string()).optional().describe('IDs of records that were created.')
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
        const requestBody: {
            performUpsert: { fieldsToMergeOn: string[] };
            records: Array<{ id?: string; fields: Record<string, unknown> }>;
            typecast?: boolean;
        } = {
            performUpsert: {
                fieldsToMergeOn: input.fieldsToMergeOn
            },
            records: input.records.map((record) => ({
                ...(record.id && { id: record.id }),
                fields: record.fields
            })),
            ...(input.typecast !== undefined && { typecast: input.typecast })
        };

        // https://airtable.com/developers/web/api/update-multiple-records
        const response = await nango.patch({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const updatedSet = new Set(providerResponse.updatedRecords ?? []);

        const records = providerResponse.records.map((record): z.infer<typeof UpsertedRecordSchema> => {
            const operation: 'created' | 'updated' = updatedSet.has(record.id) ? 'updated' : 'created';
            return {
                id: record.id,
                createdTime: record.createdTime,
                fields: record.fields,
                operation
            };
        });

        return {
            records,
            ...(providerResponse.updatedRecords && { updatedRecordIds: providerResponse.updatedRecords }),
            ...(providerResponse.createdRecords && { createdRecordIds: providerResponse.createdRecords })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
