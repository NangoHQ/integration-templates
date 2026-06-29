import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const LineInputSchema = z.object({
    type: z.number().describe('Line item type. Example: 0 for Item'),
    name: z.string().describe('Line item name. Example: "Test Estimate Line"'),
    qty: z.number().describe('Quantity. Example: 1'),
    unit_cost: z.object({
        amount: z.string().describe('Unit cost amount. Example: "100.00"'),
        code: z.string().describe('Currency code. Example: "USD"')
    })
});

const InputSchema = z.object({
    customerid: z.number().describe('Customer ID. Example: 567521'),
    create_date: z.string().describe('Creation date in YYYY-MM-DD format. Example: "2026-06-29"'),
    currency_code: z.string().describe('Currency code. Example: "USD"'),
    lines: z.array(LineInputSchema).describe('Line items for the estimate')
});

const ProviderUnitCostSchema = z.object({
    amount: z.string().optional(),
    code: z.string().optional()
});

const ProviderLineSchema = z.object({
    type: z.number().optional(),
    name: z.string().optional(),
    qty: z.number().optional(),
    unit_cost: ProviderUnitCostSchema.optional()
});

const ProviderEstimateSchema = z.object({
    id: z.number(),
    customerid: z.number().optional(),
    create_date: z.string().optional(),
    currency_code: z.string().optional(),
    lines: z.array(ProviderLineSchema).optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Estimate ID. Example: 123456'),
    customerid: z.number().optional(),
    create_date: z.string().optional(),
    currency_code: z.string().optional(),
    lines: z.array(ProviderLineSchema).optional()
});

const FreshBooksCreateEstimateResponseSchema = z.object({
    response: z.object({
        result: z.object({
            estimate: ProviderEstimateSchema
        })
    })
});

const action = createAction({
    description: 'Create an estimate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:estimates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metaResult = MetadataSchema.safeParse(metadata);

        if (!metaResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'Missing or invalid accountId in connection metadata.'
            });
        }

        const accountId = metaResult.data.accountId;

        const response = await nango.post({
            // https://www.freshbooks.com/api
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/estimates/estimates`,
            data: {
                estimate: {
                    customerid: input.customerid,
                    create_date: input.create_date,
                    currency_code: input.currency_code,
                    lines: input.lines.map((line) => ({
                        type: line.type,
                        name: line.name,
                        qty: line.qty,
                        unit_cost: {
                            amount: line.unit_cost.amount,
                            code: line.unit_cost.code
                        }
                    }))
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Invalid or empty response from FreshBooks API.'
            });
        }

        const parsedResponseResult = FreshBooksCreateEstimateResponseSchema.safeParse(response.data);
        if (!parsedResponseResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }
        const estimate = parsedResponseResult.data.response.result.estimate;

        return {
            id: estimate.id,
            ...(estimate.customerid !== undefined && { customerid: estimate.customerid }),
            ...(estimate.create_date !== undefined && { create_date: estimate.create_date }),
            ...(estimate.currency_code !== undefined && { currency_code: estimate.currency_code }),
            ...(estimate.lines !== undefined && {
                lines: estimate.lines.map((line) => ({
                    ...(line.type !== undefined && { type: line.type }),
                    ...(line.name !== undefined && { name: line.name }),
                    ...(line.qty !== undefined && { qty: line.qty }),
                    ...(line.unit_cost !== undefined && {
                        unit_cost: {
                            ...(line.unit_cost.amount !== undefined && { amount: line.unit_cost.amount }),
                            ...(line.unit_cost.code !== undefined && { code: line.unit_cost.code })
                        }
                    })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
