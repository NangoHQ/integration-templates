import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Order ID. Example: 1234')
});

const ProviderOrderProductSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    quantity: z.number().optional(),
    total: z.number().optional()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    total: z.number().optional(),
    status: z.string().optional(),
    time: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    notes: z.string().optional(),
    products: z.array(ProviderOrderProductSchema).optional()
});

const OutputSchema = ProviderOrderSchema;

const action = createAction({
    description: 'Retrieve a single order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        try {
            // @allowTryCatch: The Nango SDK throws script_http_error for non-2xx status codes.
            // We catch 404 to convert it into a structured ActionError so the action can return
            // a meaningful error instead of an unhandled runtime exception.
            response = await nango.get({
                // https://developers.acuityscheduling.com/reference/get-orders
                endpoint: `/orders/${encodeURIComponent(input.id)}`,
                retries: 3
            });
        } catch (err: unknown) {
            // @allowTryCatch: The Nango SDK throws script_http_error for non-2xx status codes.
            // We catch 404 to convert it into a structured ActionError.
            if (typeof err === 'object' && err !== null && 'status' in err && err.status === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Order with ID ${input.id} not found.`
                });
            }
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const response = err.response;
                if (typeof response === 'object' && response !== null && 'data' in response) {
                    const data = response.data;
                    if (typeof data === 'object' && data !== null && 'status_code' in data && data.status_code === 404) {
                        throw new nango.ActionError({
                            type: 'not_found',
                            message: `Order with ID ${input.id} not found.`
                        });
                    }
                }
            }
            throw err;
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Order with ID ${input.id} not found.`
            });
        }

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return providerOrder;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
