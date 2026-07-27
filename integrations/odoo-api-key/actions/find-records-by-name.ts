import { z } from 'zod';
import { createAction } from 'nango';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    name: z.string().describe('Partial name to search for. Example: "Nango"'),
    args: z.array(z.unknown()).optional().describe('Optional extra Odoo domain filter. Example: [["is_company", "=", true]]'),
    limit: z.number().int().positive().optional().describe('Maximum number of results. Example: 10')
});

const ProviderTupleSchema = z.array(z.union([z.number(), z.string(), z.boolean()]));

const OutputSchema = z.object({
    results: z.array(
        z.object({
            id: z.number(),
            display_name: z.string()
        })
    )
});

const action = createAction({
    description: 'Find Odoo records by a partial name match, as used for autocomplete/dropdown lookups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `/json/2/${encodeURIComponent(input.model)}/name_search`,
            data: {
                name: input.name,
                ...(input.args !== undefined && { args: input.args }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            baseUrlOverride,
            headers,
            retries: 3
        });

        const rawResults = z.array(ProviderTupleSchema).parse(response.data);

        const results = rawResults.map((tuple) => {
            if (tuple.length < 2 || typeof tuple[0] !== 'number' || typeof tuple[1] !== 'string') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected name_search response format',
                    tuple: JSON.stringify(tuple)
                });
            }

            return {
                id: tuple[0],
                display_name: tuple[1]
            };
        });

        return { results };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
