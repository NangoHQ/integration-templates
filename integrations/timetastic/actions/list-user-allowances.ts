import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderToilSchema = z.object({
    id: z.number().nullish(),
    amount: z.number().nullish(),
    description: z.string().nullish()
});

const ProviderToilsSchema = z.object({
    total: z.number().nullish(),
    toil: z.array(ProviderToilSchema).nullish()
});

const ProviderUserAllowanceSchema = z.object({
    year: z.number().nullish(),
    allowance: z.number().nullish(),
    toils: ProviderToilsSchema.nullish(),
    carryForward: z.number().nullish()
});

const ProviderUsersAllowancesResponseSchema = z.object({
    userId: z.number().nullish(),
    userAllowances: z.array(ProviderUserAllowanceSchema).nullish()
});

const ToilSchema = z.object({
    id: z.number().optional(),
    amount: z.number().optional(),
    description: z.string().optional()
});

const ToilsSchema = z.object({
    total: z.number().optional(),
    toil: z.array(ToilSchema).optional()
});

const UserAllowanceSchema = z.object({
    year: z.number().optional(),
    allowance: z.number().optional(),
    toils: ToilsSchema.optional(),
    carryForward: z.number().optional()
});

const UsersAllowancesResponseSchema = z.object({
    userId: z.number().optional(),
    userAllowances: z.array(UserAllowanceSchema).optional()
});

const OutputSchema = z.array(UsersAllowancesResponseSchema);

const action = createAction({
    description: 'List allowances, TOIL, and carry-forwards for every user across all years.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // https://app.timetastic.co.uk/swagger/v1/swagger.json
        const response = await nango.get({
            endpoint: '/users/allowances',
            retries: 3
        });

        const parsed = z.array(ProviderUsersAllowancesResponseSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        return parsed.data.map((item) => ({
            ...(item.userId != null && { userId: item.userId }),
            ...(item.userAllowances != null && {
                userAllowances: item.userAllowances.map((ua) => ({
                    ...(ua.year != null && { year: ua.year }),
                    ...(ua.allowance != null && { allowance: ua.allowance }),
                    ...(ua.toils != null && {
                        toils: {
                            ...(ua.toils.total != null && { total: ua.toils.total }),
                            ...(ua.toils.toil != null && {
                                toil: ua.toils.toil.map((t) => ({
                                    ...(t.id != null && { id: t.id }),
                                    ...(t.amount != null && { amount: t.amount }),
                                    ...(t.description != null && { description: t.description })
                                }))
                            })
                        }
                    }),
                    ...(ua.carryForward != null && { carryForward: ua.carryForward })
                }))
            })
        }));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
