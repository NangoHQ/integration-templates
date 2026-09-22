import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    cursor: z.string().optional(),
    per_page: z.number().int().min(1).max(100).optional()
});

const InventoryExportSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    items: z.array(InventoryExportSchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(InventoryExportSchema),
    pagination: z
        .object({
            page: z.number(),
            pages: z.number()
        })
        .passthrough()
});

function parseCursor(cursor: string): number {
    if (!/^\d+$/.test(cursor)) {
        throw new Error('Invalid cursor: must be a positive integer string');
    }
    const page = Number(cursor);
    if (!Number.isSafeInteger(page) || page <= 0) {
        throw new Error('Invalid cursor: must be a positive integer string');
    }
    return page;
}

const action = createAction({
    description: 'List inventory exports for the authenticated user.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/inventory/exports', group: 'Marketplace' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const page = input.cursor ? parseCursor(input.cursor) : 1;

        // https://www.discogs.com/developers#page:inventory-export,header-inventory-export-get-recent-exports
        const response = await nango.get({
            endpoint: '/inventory/export',
            params: { page, per_page: input.per_page ?? 50 },
            retries: 3
        });

        const { items, pagination } = ProviderResponseSchema.parse(response.data);
        const next_cursor = pagination.page < pagination.pages ? String(pagination.page + 1) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
