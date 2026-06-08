import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('Odoo model name. Example: "res.partner"'),
    method: z.string().describe('Method name to execute. Example: "search_count"'),
    args: z.array(z.unknown()).optional().describe('Positional arguments as a JSON array.'),
    kwargs: z.record(z.string(), z.unknown()).optional().describe('Keyword arguments as a JSON object.')
});

const ProviderResponseSchema = z.object({
    result: z.unknown()
});

const OutputSchema = z.object({
    result: z.unknown().describe('The raw result returned by the Odoo method.')
});

const action = createAction({
    description: 'Call an Odoo model method through execute_kw',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/execute-kw',
        group: 'Actions'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: `/1.0/${encodeURIComponent(input.model)}/execute`,
            data: {
                method: input.method,
                args: input.args ?? [],
                kwargs: input.kwargs ?? {}
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            result: providerResponse.result
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
