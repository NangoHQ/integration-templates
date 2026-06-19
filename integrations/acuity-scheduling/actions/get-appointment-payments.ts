import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Appointment ID. Example: 1722092210')
});

const PaymentSchema = z.object({
    transactionID: z.string().optional(),
    created: z.string().optional(),
    processor: z.string().optional(),
    amount: z.string().optional()
});

const OutputSchema = z.object({
    payments: z.array(PaymentSchema)
});

const action = createAction({
    description: 'Retrieve payment transactions for an appointment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-appointments-id-payments
            endpoint: `/appointments/${encodeURIComponent(input.id)}/payments`,
            retries: 3
        });

        const payments = z.array(PaymentSchema).parse(response.data);

        return {
            payments
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
