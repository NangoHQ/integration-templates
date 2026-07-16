import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { isExpiredCursorError, withOverlap } from '../sync-helpers.js';

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const RefundSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    amount_money: MoneySchema.optional(),
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    location_id: z.string().optional(),
    reason: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const RefundsPageSchema = z.object({
    refunds: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync refunds.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Refund: RefundSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || '1970-01-01T00:00:00.000Z';
        let lastProcessedUpdatedAt = updatedAfter;

        const runPagination = async (startCursor: string | undefined): Promise<void> => {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds
                endpoint: '/v2/refunds',
                params: {
                    updated_at_begin_time: updatedAfter,
                    sort_order: 'ASC',
                    sort_field: 'UPDATED_AT',
                    ...(startCursor && { cursor: startCursor })
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'cursor',
                    response_path: 'refunds',
                    limit_name_in_request: 'limit',
                    limit: 100,
                    // IMPORTANT: `on_page` fires one step "ahead" of the `for await` loop body's
                    // processing of the same page (see orders.ts for the full explanation). Doing
                    // the batchSave + checkpoint bookkeeping directly in the loop body using a
                    // `cursor` variable set by `on_page` would persist the PREVIOUS page's cursor,
                    // causing a resumed run to re-fetch a page it already processed. Do the real
                    // work HERE instead, where `response` and `nextPageParam` unambiguously
                    // correspond to the SAME page.
                    on_page: async ({ nextPageParam, response }) => {
                        const parsedPage = RefundsPageSchema.safeParse(response.data);
                        if (!parsedPage.success) {
                            throw new Error(`Failed to parse refunds page: ${parsedPage.error.message}`);
                        }

                        const validRefunds = z.array(RefundSchema).safeParse(parsedPage.data.refunds ?? []);
                        if (!validRefunds.success) {
                            throw new Error(`Invalid refund data: ${validRefunds.error.message}`);
                        }

                        if (validRefunds.data.length > 0) {
                            await nango.batchSave(validRefunds.data, 'Refund');

                            const lastRefund = validRefunds.data[validRefunds.data.length - 1];
                            if (lastRefund) {
                                lastProcessedUpdatedAt = lastRefund.updated_at ?? lastRefund.created_at ?? lastProcessedUpdatedAt;
                            }
                        }

                        const cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                        if (cursor) {
                            await nango.saveCheckpoint({
                                updated_after: updatedAfter,
                                cursor
                            });
                        }
                    }
                },
                retries: 3
            };

            // Drain the generator to completion; all per-page work happens in `on_page` above.
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _page of nango.paginate(proxyConfig)) {
                // no-op
            }
        };

        // @allowTryCatch: an expired/invalid pagination cursor from a stale checkpoint must be
        // caught here so we can drop it and restart from `updated_after` instead of failing this
        // (and every future) run. Any other error is re-thrown unchanged.
        try {
            await runPagination(checkpoint.cursor || undefined);
        } catch (error) {
            if (!isExpiredCursorError(error)) {
                throw error;
            }
            // Drop the stale cursor and restart this run from the last known-good
            // updated_after instead of getting stuck on it forever.
            lastProcessedUpdatedAt = updatedAfter;
            await runPagination(undefined);
        }

        // Only slide the high-water mark back when this run actually advanced it - otherwise
        // repeatedly subtracting the overlap on an unchanged checkpoint would make the query
        // window grow without bound across empty runs.
        const nextUpdatedAfter = lastProcessedUpdatedAt === updatedAfter ? updatedAfter : withOverlap(lastProcessedUpdatedAt);

        await nango.saveCheckpoint({ updated_after: nextUpdatedAfter, cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
