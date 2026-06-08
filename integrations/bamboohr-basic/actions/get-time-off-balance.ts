import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('The ID of the employee to get time off balances for. Example: "123"'),
    startDate: z.string().optional().describe('The start date for the balance calculation window, in YYYY-MM-DD format.'),
    endDate: z
        .string()
        .optional()
        .describe('The date to calculate the time off balance as of, in YYYY-MM-DD format. Defaults to company today if not provided.'),
    precision: z
        .number()
        .int()
        .min(0)
        .max(4)
        .optional()
        .describe('Number of decimal places for balance and usedYearToDate values. Minimum 0, maximum 4. Defaults to 2.')
});

const ProviderBalanceSchema = z.object({
    timeOffType: z.union([z.number(), z.string()]),
    name: z.string(),
    units: z.string(),
    balance: z.union([z.number(), z.string()]),
    end: z.string().optional(),
    policyType: z.string().optional(),
    usedYearToDate: z.union([z.number(), z.string()]).optional()
});

const OutputSchema = z.object({
    balances: z.array(ProviderBalanceSchema)
});

const action = createAction({
    description: 'Retrieve the time off balance for an employee in BambooHR.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-time-off-balance',
        group: 'Time Off'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-time-off-balance
            endpoint: `/v1/employees/${encodeURIComponent(input.employeeId)}/time_off/calculator`,
            headers: {
                Accept: 'application/json'
            },
            params: {
                ...(input.startDate !== undefined && { start: input.startDate }),
                ...(input.endDate !== undefined && { end: input.endDate }),
                ...(input.precision !== undefined && { precision: String(input.precision) })
            },
            retries: 3
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No time off balances found for the employee.',
                employeeId: input.employeeId
            });
        }

        const balances = z.array(ProviderBalanceSchema).parse(response.data);

        return {
            balances
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
