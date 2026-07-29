import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company code / data area ID. Example: "dat"'),
    purchaseOrderNumber: z.string().optional().describe('Purchase order number to scope lines to a single order. Example: "DAT-000001"'),
    cursor: z.string().optional().describe('Pagination cursor (skip value) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 1000.')
});

const PurchaseOrderLineSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(PurchaseOrderLineSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List purchase order lines, optionally scoped to a parent purchase order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Financials.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 1000;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric skip value',
                cursor: input.cursor
            });
        }

        const filters: string[] = [];

        if (input.dataAreaId !== undefined) {
            filters.push(`dataAreaId eq '${input.dataAreaId.replace(/'/g, "''")}'`);
        }

        if (input.purchaseOrderNumber !== undefined) {
            filters.push(`PurchaseOrderNumber eq '${input.purchaseOrderNumber.replace(/'/g, "''")}'`);
        }

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (filters.length > 0) {
            params['$filter'] = filters.join(' and ');
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderLinesV2',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('value' in response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response format from PurchaseOrderLinesV2'
            });
        }

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => PurchaseOrderLineSchema.parse(item));

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
