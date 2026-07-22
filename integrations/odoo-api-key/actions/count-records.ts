import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    domain: z.array(z.unknown()).optional().describe('Odoo search domain filter. Example: [["name", "ilike", "Nango"]]')
});

const OutputSchema = z.object({
    count: z.number().describe('Number of records matching the domain')
});

const action = createAction({
    description: 'Count Odoo records matching a domain, without fetching them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `/json/2/${encodeURIComponent(input.model)}/search_count`,
            data: {
                domain: input.domain ?? []
            },
            baseUrlOverride,
            headers,
            retries: 3
        });

        const rawCount = response.data;
        if (typeof rawCount !== 'number' || !Number.isInteger(rawCount)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an integer count from Odoo search_count, received something else.',
                raw_response: rawCount
            });
        }

        return {
            count: rawCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
