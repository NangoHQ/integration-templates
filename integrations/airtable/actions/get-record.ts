import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tbl1234567890abcd" or "Users"'),
    recordId: z.string().describe('The ID of the record to retrieve. Example: "rec1234567890abcd"'),
    cellFormat: z.string().optional().describe('The format to return cell values. Use "json" or "string". Defaults to "json".'),
    timeZone: z.string().optional().describe('The time zone to use when formatting dates. Example: "America/New_York"'),
    userLocale: z.string().optional().describe('The user locale to use when formatting dates. Example: "en-US"'),
    returnFieldsByFieldId: z.boolean().optional().describe('If true, field values are keyed by field ID instead of field name.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the record.'),
    createdTime: z.string().describe('The ISO 8601 timestamp when the record was created.'),
    fields: z.record(z.string(), z.unknown()).describe('The field values of the record, keyed by field name or field ID.')
});

const action = createAction({
    description: 'Retrieve a single Airtable record by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/get-record
        const response = await nango.get({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            params: {
                ...(input.cellFormat !== undefined && { cellFormat: input.cellFormat }),
                ...(input.timeZone !== undefined && { timeZone: input.timeZone }),
                ...(input.userLocale !== undefined && { userLocale: input.userLocale }),
                ...(input.returnFieldsByFieldId !== undefined && { returnFieldsByFieldId: input.returnFieldsByFieldId.toString() })
            },
            retries: 3
        });

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            createdTime: providerRecord.createdTime,
            fields: providerRecord.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
