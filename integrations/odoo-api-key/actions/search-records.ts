import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    domain: z.array(z.unknown()).optional().describe('Odoo search domain filter. Example: [["name","like","Nango Test"]]'),
    limit: z.number().int().optional().describe('Maximum number of records to return.'),
    offset: z.number().int().optional().describe('Number of records to skip.'),
    order: z.string().optional().describe('Sort order string. Example: "name desc"')
});

const OutputSchema = z.object({
    model: z.string(),
    ids: z.array(z.number())
});

const action = createAction({
    description: 'Search for Odoo record IDs matching a domain, without reading their fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.domain !== undefined && { domain: input.domain }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.offset !== undefined && { offset: input.offset }),
            ...(input.order !== undefined && { order: input.order })
        };

        const response = await nango.post({
            // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
            endpoint: `/2/${encodeURIComponent(input.model)}/search`,
            data: body,
            retries: 3
        });

        const providerIds = z.array(z.number()).parse(response.data);

        return {
            model: input.model,
            ids: providerIds
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
