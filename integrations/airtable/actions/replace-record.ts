import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "Table Name"'),
    recordId: z.string().describe('The ID of the record to replace. Example: "recXXXXXXXXXXXXXX"'),
    fields: z
        .record(z.string(), z.unknown())
        .describe('Object containing field names or IDs as keys and field values. Example: {"Name": "New Value", "Status": "Done"}'),
    typecast: z
        .boolean()
        .optional()
        .describe('If true, the Airtable API will perform best-effort automatic data conversion from string values. Default: false'),
    returnFieldsByFieldId: z.boolean().optional().describe('If true, returns field objects where the key is the field ID instead of field name. Default: false')
});

const ProviderRecordSchema = z.object({
    id: z.string(),
    fields: z.record(z.string(), z.unknown()),
    createdTime: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    fields: z.record(z.string(), z.unknown()),
    createdTime: z.string()
});

const action = createAction({
    description: 'Replace a single Airtable record. This performs a full replace using PUT - any fields not included will be cleared.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/replace-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            fields: Record<string, unknown>;
            typecast?: boolean;
            returnFieldsByFieldId?: boolean;
        } = {
            fields: input.fields
        };

        if (input.typecast !== undefined) {
            requestBody.typecast = input.typecast;
        }

        if (input.returnFieldsByFieldId !== undefined) {
            requestBody.returnFieldsByFieldId = input.returnFieldsByFieldId;
        }

        // https://airtable.com/developers/web/api/update-record
        const response = await nango.put({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}/${input.recordId}`,
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found or API returned empty response',
                recordId: input.recordId,
                baseId: input.baseId,
                tableIdOrName: input.tableIdOrName
            });
        }

        const providerRecord = ProviderRecordSchema.parse(response.data);

        return {
            id: providerRecord.id,
            fields: providerRecord.fields,
            createdTime: providerRecord.createdTime
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
