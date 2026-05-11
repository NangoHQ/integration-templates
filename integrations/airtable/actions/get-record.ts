import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "tblXXXXXXXXXXXXXX" or "My Table"'),
    recordId: z.string().describe('Airtable record ID. Example: "recXXXXXXXXXXXXXX"'),
    cellFormat: z.enum(['json', 'string']).optional().describe('The cell format to request. Defaults to json.'),
    timeZone: z.string().optional().describe('Time zone to use for formatting dates when cell_format is string.'),
    userLocale: z.string().optional().describe('User locale to use for formatting dates when cell_format is string.'),
    returnFieldsByFieldId: z.boolean().optional().describe('Return field objects where the key is the field id instead of field name.')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    createdTime: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    createdTime: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single Airtable record by record ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const queryParams: Record<string, string> = {};
        if (input.cellFormat !== undefined) {
            queryParams['cellFormat'] = input.cellFormat;
        }
        if (input.timeZone !== undefined) {
            queryParams['timeZone'] = input.timeZone;
        }
        if (input.userLocale !== undefined) {
            queryParams['userLocale'] = input.userLocale;
        }
        if (input.returnFieldsByFieldId !== undefined) {
            queryParams['returnFieldsByFieldId'] = String(input.returnFieldsByFieldId);
        }

        const response = await nango.get({
            // https://airtable.com/developers/web/api/get-record
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            ...(Object.keys(queryParams).length > 0 && { params: queryParams }),
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found or API returned empty response.',
                baseId: input.baseId,
                tableIdOrName: input.tableIdOrName,
                recordId: input.recordId
            });
        }

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            ...(providerRecord.createdTime !== undefined && { createdTime: providerRecord.createdTime }),
            ...(providerRecord.fields !== undefined && { fields: providerRecord.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
