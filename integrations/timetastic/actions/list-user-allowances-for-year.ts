import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    year: z.number().int().describe('The year to query. Example: 2026')
});

const ToilSchema = z.object({
    id: z.number().int().nullable().optional(),
    amount: z.number().nullable().optional(),
    description: z.string().nullable().optional()
});

const ToilsSchema = z.object({
    total: z.number().optional(),
    toil: z.array(ToilSchema).nullable().optional()
});

const UserAllowanceSchema = z.object({
    year: z.number().int().optional(),
    allowance: z.number().optional(),
    toils: ToilsSchema.optional(),
    carryForward: z.number().optional()
});

const UsersAllowancesSchema = z.object({
    userId: z.number().int().optional(),
    userAllowances: z.array(UserAllowanceSchema).nullable().optional()
});

const OutputSchema = z.object({
    users: z.array(UsersAllowancesSchema)
});

const action = createAction({
    description: 'List allowances, TOIL, and carry-forwards for every user for a single year',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: `/users/allowances/${encodeURIComponent(String(input.year))}`,
            retries: 3
        });

        const parsed = z.array(UsersAllowancesSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape',
                details: parsed.error.issues
            });
        }

        return {
            users: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
