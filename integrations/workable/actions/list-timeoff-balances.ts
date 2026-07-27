import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('The employee ID to retrieve time-off balances for. Example: "19ff54"')
});

const ProviderBalanceSchema = z.object({
    units_available: z.string().describe('Available units for the time-off category. Example: "13.00"'),
    units_carry_over_available: z.string().describe('Available units carried over from a previous cycle. Example: "0.00"'),
    units_used: z.string().describe('Units used during the current cycle. Example: "0.00"'),
    has_unlimited_timeoff: z.boolean().describe('Whether the category has unlimited time-off.'),
    category_id: z.string().describe('The unique ID of the time-off category. Example: "76f"'),
    time_off_tracking_unit: z.string().describe('Tracking unit for the category. Example: "full_days" or "half_days"'),
    name: z.string().describe('Name of the time-off category. Example: "Sick leave"'),
    description: z.string().describe('Description of the time-off category.')
});

const ProviderResponseSchema = z.object({
    balances: z.array(ProviderBalanceSchema)
});

const OutputSchema = z.object({
    balances: z.array(
        z.object({
            units_available: z.string(),
            units_carry_over_available: z.string(),
            units_used: z.string(),
            has_unlimited_timeoff: z.boolean(),
            category_id: z.string(),
            time_off_tracking_unit: z.string(),
            name: z.string(),
            description: z.string()
        })
    )
});

const action = createAction({
    description: "Get an employee's current time-off balances by category.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_timeoff'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/timeoffbalances.md
            endpoint: '/spi/v3/timeoff/balances',
            params: {
                employee_id: input.employee_id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Workable API',
                details: parsed.error.message
            });
        }

        return {
            balances: parsed.data.balances.map((balance) => ({
                units_available: balance.units_available,
                units_carry_over_available: balance.units_carry_over_available,
                units_used: balance.units_used,
                has_unlimited_timeoff: balance.has_unlimited_timeoff,
                category_id: balance.category_id,
                time_off_tracking_unit: balance.time_off_tracking_unit,
                name: balance.name,
                description: balance.description
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
