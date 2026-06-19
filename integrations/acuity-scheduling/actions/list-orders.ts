import { createAction } from 'nango';
import { z } from 'zod';

const OrderSchema = z.object({
    id: z.number().describe('Order ID'),
    total: z.string().optional(),
    status: z.string().optional(),
    time: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    notes: z.string().optional()
});

const InputSchema = z.object({
    max: z.number().optional().describe('Maximum number of results')
});

const OutputSchema = z.array(OrderSchema);

const action = createAction({
    description: 'List orders',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        // https://developers.acuityscheduling.com/reference/get-orders
        const response = await nango.get({
            endpoint: '/orders',
            retries: 3,
            ...(input.max !== undefined && { params: { max: input.max } })
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from provider',
                errors: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export default action;
