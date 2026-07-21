import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.number().int().describe('User ID. Example: 1522999')
});

const ToilSchema = z.object({
    id: z.number().int().optional(),
    amount: z.number().optional(),
    description: z.string().optional()
});

const ToilsSchema = z.object({
    total: z.number().optional(),
    toil: z.array(ToilSchema).optional()
});

const AllowanceRecordSchema = z.object({
    year: z.number().int(),
    allowance: z.number().optional(),
    toils: ToilsSchema.optional(),
    carryForward: z.number().optional()
});

const OutputSchema = z.object({
    userId: z.number().int(),
    allowances: z.array(AllowanceRecordSchema)
});

const ProviderToilSchema = z.object({
    id: z.number().int().nullish(),
    amount: z.number().nullish(),
    description: z.string().nullish()
});

const ProviderToilsSchema = z.object({
    total: z.number().nullish(),
    toil: z.array(ProviderToilSchema).nullish()
});

const ProviderAllowanceRecordSchema = z.object({
    year: z.number().int(),
    allowance: z.number().nullish(),
    toils: ProviderToilsSchema.nullish(),
    carryForward: z.number().nullish()
});

const ProviderResponseSchema = z.array(ProviderAllowanceRecordSchema);

const action = createAction({
    description: 'Get allowance, TOIL, and carry-forward records for one user across all years.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/ (interactive OpenAPI reference)
            endpoint: `/users/${encodeURIComponent(String(input.userId))}/allowances`,
            retries: 3
        });

        const rawData = response.data;
        if (!Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected an array of allowances from the provider.'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(rawData);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Provider response does not match expected allowance schema.',
                details: parsed.error.issues
            });
        }

        const allowances = parsed.data.map((record) => ({
            year: record.year,
            ...(record.allowance != null && { allowance: record.allowance }),
            ...(record.carryForward != null && { carryForward: record.carryForward }),
            ...(record.toils != null && {
                toils: {
                    ...(record.toils.total != null && { total: record.toils.total }),
                    ...(record.toils.toil != null && {
                        toil: record.toils.toil.map((t) => ({
                            ...(t.id != null && { id: t.id }),
                            ...(t.amount != null && { amount: t.amount }),
                            ...(t.description != null && { description: t.description })
                        }))
                    })
                }
            })
        }));

        return {
            userId: input.userId,
            allowances
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
