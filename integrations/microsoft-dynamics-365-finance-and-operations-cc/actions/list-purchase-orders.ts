import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    top: z.number().int().positive().optional().describe('Maximum number of records to return per page. Default: 100.')
});

const ProviderResponseSchema = z.object({
    value: z.array(z.object({}).passthrough())
});

const PurchaseOrderHeaderSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(PurchaseOrderHeaderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List purchase order headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        if (input.top !== undefined && (!Number.isInteger(input.top) || input.top <= 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'top must be a positive integer.'
            });
        }
        const top = input.top ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/PurchaseOrderHeadersV2',
            params: {
                $top: String(top),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const items = providerData.value;

        const nextCursor = items.length === top ? String(skip + top) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
