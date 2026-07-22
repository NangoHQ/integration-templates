import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    domain: z.array(z.unknown()).optional().describe('Search domain filter. Example: [["name", "ilike", "Nango"]]'),
    fields: z.array(z.string()).optional().describe('Fields to return. Example: ["name", "email"]'),
    limit: z.number().int().optional().describe('Maximum number of records to return.'),
    offset: z.number().int().optional().describe('Number of records to skip.')
});

const OutputSchema = z.array(z.object({}).passthrough());

const action = createAction({
    description: 'Search and read records from any Odoo model.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};
        if (input.domain !== undefined) {
            body['domain'] = input.domain;
        }
        if (input.fields !== undefined) {
            body['fields'] = input.fields;
        }
        if (input.limit !== undefined) {
            body['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            body['offset'] = input.offset;
        }

        // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
        const response = await nango.post({
            endpoint: `2/${encodeURIComponent(input.model)}/search_read`,
            data: body,
            retries: 3
        });

        let rawData: unknown = response.data;
        if (typeof rawData === 'string') {
            rawData = JSON.parse(rawData);
        }

        const providerSchema = z.array(z.object({}).passthrough());
        const records = providerSchema.parse(rawData);
        return records;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
