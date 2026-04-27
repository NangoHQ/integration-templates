import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "appXXXXXXXXXXXXXX"'),
    tableIdOrName: z.string().describe('The ID or name of the table. Example: "tblXXXXXXXXXXXXXX" or "My Table"'),
    recordIds: z.array(z.string()).max(10).describe('Array of record IDs to delete (maximum 10). Example: ["recXXXXXXXXXXXXXX"]')
});

const ProviderDeletedRecordSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const ProviderResponseSchema = z.object({
    records: z.array(ProviderDeletedRecordSchema)
});

const DeletedRecordSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    records: z.array(DeletedRecordSchema)
});

const action = createAction({
    description: 'Delete multiple Airtable records by record ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/batch-delete-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build query parameters with repeated records[] keys
        const params: Record<string, string> = {};
        for (let i = 0; i < input.recordIds.length; i++) {
            const recordId = input.recordIds[i];
            if (recordId) {
                params[`records[${i}]`] = recordId;
            }
        }

        const config: ProxyConfiguration = {
            // https://airtable.com/developers/web/api/delete-multiple-records
            endpoint: `/v0/${input.baseId}/${encodeURIComponent(input.tableIdOrName)}`,
            params,
            retries: 3
        };

        const response = await nango.delete(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            records: parsed.records.map((record) => ({
                id: record.id,
                deleted: record.deleted
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
