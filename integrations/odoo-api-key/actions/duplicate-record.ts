import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().int().positive().describe('Record ID to duplicate. Example: 9'),
    default: z.record(z.string(), z.unknown()).optional().describe('Optional field overrides for the duplicate record.')
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the newly created duplicate record.')
});

const CopyResponseSchema = z.array(z.number());

const action = createAction({
    description: 'Duplicate an existing Odoo model record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ids: [input.id]
        };

        if (input['default'] !== undefined) {
            body['default'] = input['default'];
        }

        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            baseUrlOverride,
            endpoint: `/json/2/${encodeURIComponent(input.model)}/copy`,
            headers,
            data: body,
            retries: 10
        });

        const rawData = response.data;
        const parsedData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const copiedIds = CopyResponseSchema.parse(parsedData);
        if (copiedIds.length === 0) {
            throw new nango.ActionError({
                type: 'duplicate_failed',
                message: 'Odoo copy returned an empty array of new IDs.'
            });
        }

        const newId = copiedIds[0];
        if (newId === undefined) {
            throw new nango.ActionError({
                type: 'duplicate_failed',
                message: 'Odoo copy returned an empty array of new IDs.'
            });
        }

        return {
            id: newId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
