import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    module: z.string().describe('Zoho CRM module API name. Examples: "Leads", "Contacts", "Accounts", "Deals", "Tasks"'),
    records: z.array(z.record(z.string(), z.unknown())).describe('Array of records to upsert. Each record should contain field values.'),
    duplicateCheckFields: z
        .array(z.string())
        .optional()
        .describe('Fields to use for duplicate checking during upsert. Examples: ["Email"], ["Last_Name", "Company"]')
});

const UpsertResultSchema = z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()),
    message: z.string(),
    status: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(UpsertResultSchema)
});

const UpsertRecordOutputSchema = z.object({
    code: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    message: z.string(),
    status: z.string()
});

const OutputSchema = z.object({
    records: z.array(UpsertRecordOutputSchema),
    totalCount: z.number().describe('Total number of records processed')
});

const action = createAction({
    description: 'Upsert records in a Zoho CRM module. Inserts new records or updates existing ones based on duplicate check fields.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/upsert-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { module, records, duplicateCheckFields } = input;

        if (records.length === 0) {
            return {
                records: [],
                totalCount: 0
            };
        }

        const headers: Record<string, string> = {};
        if (duplicateCheckFields && duplicateCheckFields.length > 0) {
            headers['X-duplicateCheck'] = duplicateCheckFields.join(',');
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/upsert-records.html
        const response = await nango.post({
            endpoint: `/crm/v2/${module}/upsert`,
            data: {
                data: records
            },
            headers,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Empty response from Zoho CRM API',
                module
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const results = providerResponse.data.map((result) => ({
            code: result.code,
            ...(Object.keys(result.details).length > 0 && { details: result.details }),
            message: result.message,
            status: result.status
        }));

        return {
            records: results,
            totalCount: results.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
