import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    ids: z.array(z.number().int().positive()).describe('Record IDs to read. Example: [9, 11]'),
    fields: z.array(z.string()).optional().describe('Fields to return. Omit to receive all fields. Example: ["name", "email"]')
});

const OutputSchema = z.object({
    records: z.array(z.record(z.string(), z.unknown()))
});

const action = createAction({
    description: 'Fetch specific Odoo records by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
        const response = await nango.post({
            endpoint: `/json/2/${encodeURIComponent(input.model)}/read`,
            data: {
                ids: input.ids,
                ...(input.fields !== undefined && { fields: input.fields })
            },
            baseUrlOverride,
            headers,
            retries: 3
        });

        const recordsSchema = z.array(z.record(z.string(), z.unknown()));
        const records = recordsSchema.parse(response.data);

        return {
            records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
