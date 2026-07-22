import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    method: z.string().describe('Odoo model method to call. Example: "default_get"'),
    ids: z.array(z.number().int().positive()).optional().describe('Record IDs for instance methods. Example: [9]'),
    kwargs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Method keyword arguments matching the Python method signature. Example: {"fields": ["name"]}')
});

const OutputSchema = z.object({
    result: z.unknown()
});

const action = createAction({
    description: 'Call an arbitrary Odoo model method through the JSON-2 API.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.ids !== undefined) {
            body['ids'] = input.ids;
        }

        if (input.kwargs !== undefined) {
            for (const [key, value] of Object.entries(input.kwargs)) {
                body[key] = value;
            }
        }

        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `/json/2/${encodeURIComponent(input.model)}/${encodeURIComponent(input.method)}`,
            data: body,
            baseUrlOverride,
            headers,
            retries: 3
        });

        return {
            result: response.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
