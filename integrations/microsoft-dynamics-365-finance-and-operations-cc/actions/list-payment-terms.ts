import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderPaymentTermSchema = z
    .object({
        Name: z.string(),
        Description: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderPaymentTermSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List payment terms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid numeric string.'
            });
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PaymentTerms',
            params: {
                $top: String(limit),
                $skip: String(skip),
                'cross-company': 'true'
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object' || !Array.isArray(response.data.value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from PaymentTerms endpoint.'
            });
        }

        const rawItems: unknown[] = response.data.value;
        const items = [];
        for (const rawItem of rawItems) {
            const parsed = ProviderPaymentTermSchema.safeParse(rawItem);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_item',
                    message: 'Failed to parse a payment term item.',
                    details: parsed.error.issues
                });
            }
            items.push(parsed.data);
        }

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
