import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the catalog item to order. Example: "04b7e94b4f7b4200086eeed18110c7fd"'),
    sysparm_quantity: z.int().min(1).optional().describe('Quantity to order. Defaults to 1 if omitted.'),
    variables: z.record(z.string(), z.string()).optional().describe('Catalog item variables keyed by question sys_id or name.')
});

const ProviderOutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    request_number: z.string(),
    request_id: z.string(),
    table: z.string()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    request_number: z.string(),
    request_id: z.string(),
    table: z.string().optional()
});

const action = createAction({
    description: 'Order a service catalog item, creating a request and request item.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.servicenow.com/dev.do#!/reference/api/sn_sc/servicecatalog/POST_items_sys_id_order_now
            endpoint: `/api/sn_sc/servicecatalog/items/${encodeURIComponent(input.sys_id)}/order_now`,
            data: {
                ...(input.sysparm_quantity !== undefined && { sysparm_quantity: input.sysparm_quantity }),
                ...(input.variables !== undefined && { variables: input.variables })
            },
            retries: 3
        });

        const envelopeSchema = z.object({
            result: ProviderOutputSchema
        });

        const envelopeParse = envelopeSchema.safeParse(response.data);
        if (envelopeParse.success) {
            const providerOutput = envelopeParse.data.result;
            return {
                sys_id: providerOutput.sys_id,
                number: providerOutput.number,
                request_number: providerOutput.request_number,
                request_id: providerOutput.request_id,
                ...(providerOutput.table != null && { table: providerOutput.table })
            };
        }

        const directParse = ProviderOutputSchema.safeParse(response.data);
        if (directParse.success) {
            const providerOutput = directParse.data;
            return {
                sys_id: providerOutput.sys_id,
                number: providerOutput.number,
                request_number: providerOutput.request_number,
                request_id: providerOutput.request_id,
                ...(providerOutput.table != null && { table: providerOutput.table })
            };
        }

        throw new nango.ActionError({
            type: 'invalid_response',
            message: 'Unexpected response format from order_now endpoint'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
