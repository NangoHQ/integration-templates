import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    domain: z.string().optional().describe("Odoo domain filter as a Python list string. Example: \"[['is_company','=',true]]\""),
    fields: z.array(z.string()).optional().describe('Field names to return. Example: ["id","name","email"]'),
    limit: z.number().optional().describe('Maximum number of records to return. Default: 100'),
    offset: z.number().optional().describe('Number of records to skip'),
    order: z.string().optional().describe('Sort order. Example: "write_date desc"'),
    write_date: z.string().optional().describe('ISO datetime string; if provided adds a write_date filter to the domain')
});

const ProviderResponseSchema = z.object({
    records: z.array(z.record(z.string(), z.unknown())),
    count: z.number()
});

const OutputSchema = z.object({
    count: z.number(),
    records: z.array(z.record(z.string(), z.unknown()))
});

const action = createAction({
    description: 'Search and read records from any Odoo model',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-read-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.domain !== undefined) {
            params['domain'] = input.domain;
        }

        if (input.fields !== undefined && input.fields.length > 0) {
            params['fields'] = `[${input.fields.map((field) => `'${field}'`).join(',')}]`;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        if (input.order !== undefined) {
            params['order'] = input.order;
        }

        if (input.write_date !== undefined) {
            params['write_date'] = input.write_date;
        }

        const response = await nango.get({
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: `/1.0/${encodeURIComponent(input.model)}`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            count: providerResponse.count,
            records: providerResponse.records
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
