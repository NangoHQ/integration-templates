import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    id: z.number().describe('Record ID to duplicate. Example: 9'),
    default: z.record(z.string(), z.unknown()).optional().describe('Optional field overrides for the duplicate record.')
});

const OutputSchema = z.object({
    id: z.number().describe('ID of the newly created duplicate record.')
});

const CopyResponseSchema = z.array(z.number());

const MetadataSchema = z.object({
    database: z.string().optional(),
    serverUrl: z.string().optional()
});

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

        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const database = metadata.database;
        const serverUrl = metadata.serverUrl;

        if (!database || !serverUrl) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'Missing required metadata: database or serverUrl.'
            });
        }

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            baseUrlOverride: `https://${serverUrl}`,
            endpoint: `/json/2/${encodeURIComponent(input.model)}/copy`,
            headers: {
                'x-odoo-database': database,
                'Content-Type': 'application/json'
            },
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
