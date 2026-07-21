import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().int().positive().describe('The id of the user to query. Example: 1522999'),
    year: z.number().int().describe('The year to query. Example: 2026')
});

const ToilSchema = z.object({
    id: z.number().nullable().optional(),
    amount: z.number().nullable().optional(),
    description: z.string().nullable().optional()
});

const ToilsSchema = z.object({
    total: z.number().optional(),
    toil: z.array(ToilSchema).nullable().optional()
});

const ProviderResponseSchema = z.object({
    year: z.number().optional(),
    allowance: z.number().optional(),
    toils: ToilsSchema.optional(),
    carryForward: z.number().optional()
});

const OutputSchema = z.object({
    year: z.number().optional(),
    allowance: z.number().optional(),
    toils: ToilsSchema.optional(),
    carryForward: z.number().optional()
});

const action = createAction({
    description: 'Get the allowance, TOIL, and carry-forward for one user for one year.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['allowances.get'],

    exec: async (nango, input) => {
        // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
        // GET /users/{userId}/allowances/{year}
        const response = await nango.get({
            endpoint: `/users/${encodeURIComponent(input.userId)}/allowances/${encodeURIComponent(input.year)}`,
            retries: 3
        });

        const parsedArray = z.array(z.unknown()).safeParse(response.data);
        if (!parsedArray.success || parsedArray.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `No allowance found for user ${input.userId} in year ${input.year}.`
            });
        }

        const rawItem = parsedArray.data[0];
        const parsedItem = ProviderResponseSchema.safeParse(rawItem);
        if (!parsedItem.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected allowance response shape.',
                details: parsedItem.error.message
            });
        }

        const providerData = parsedItem.data;

        return {
            ...(providerData.year !== undefined && { year: providerData.year }),
            ...(providerData.allowance !== undefined && { allowance: providerData.allowance }),
            ...(providerData.toils !== undefined && {
                toils: {
                    ...(providerData.toils.total !== undefined && { total: providerData.toils.total }),
                    ...(providerData.toils.toil !== undefined && {
                        toil:
                            providerData.toils.toil === null
                                ? null
                                : providerData.toils.toil.map((t) => ({
                                      ...(t.id !== undefined && t.id !== null && { id: t.id }),
                                      ...(t.amount !== undefined && t.amount !== null && { amount: t.amount }),
                                      ...(t.description !== undefined && t.description !== null && { description: t.description })
                                  }))
                    })
                }
            }),
            ...(providerData.carryForward !== undefined && { carryForward: providerData.carryForward })
        };
    }
});

export default action;
