import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { isExpiredCursorError, withOverlap } from '../sync-helpers.js';

const PaymentSchema = z.object({
    id: z.string(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    amount_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    total_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    approved_money: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    location_id: z.string().optional(),
    order_id: z.string().optional(),
    source_type: z.string().optional(),
    card_details: z.unknown().optional(),
    processing_fee: z.array(z.unknown()).optional(),
    note: z.string().optional(),
    receipt_number: z.string().optional(),
    receipt_url: z.string().optional(),
    delay_action: z.string().optional(),
    delayed_until: z.string().optional(),
    team_member_id: z.string().optional(),
    employee_id: z.string().optional(),
    version_token: z.string().optional(),
    application_details: z.unknown().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const PaymentsPageSchema = z.object({
    payments: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync payments',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint == null ? { updated_after: '', cursor: '' } : CheckpointSchema.parse(rawCheckpoint);
        const updatedAfter = checkpoint.updated_after || '1970-01-01T00:00:00.000Z';
        let lastProcessedUpdatedAt = updatedAfter;

        const runPagination = async (startCursor: string | undefined): Promise<void> => {
            const params: Record<string, string | number | string[] | number[]> = {
                sort_order: 'ASC',
                sort_field: 'UPDATED_AT',
                updated_at_begin_time: updatedAfter
            };
            if (startCursor) {
                params['cursor'] = startCursor;
            }

            const proxyConfig: ProxyConfiguration = {
                // https://developer.squareup.com/reference/square/payments-api/list-payments
                endpoint: '/v2/payments',
                params,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'cursor',
                    cursor_path_in_response: 'cursor',
                    response_path: 'payments',
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
                        const parsedPage = PaymentsPageSchema.safeParse(response.data);
                        if (!parsedPage.success) {
                            throw new Error(`Failed to parse payments page: ${parsedPage.error.message}`);
                        }

                        const payments = (parsedPage.data.payments ?? []).map((item) => {
                            const result = PaymentSchema.safeParse(item);
                            if (!result.success) {
                                throw new Error(`Failed to parse payment: ${result.error.message}`);
                            }
                            const record = result.data;
                            return {
                                id: record.id,
                                status: record.status,
                                created_at: record.created_at,
                                updated_at: record.updated_at,
                                amount_money: record.amount_money,
                                total_money: record.total_money,
                                approved_money: record.approved_money,
                                location_id: record.location_id,
                                order_id: record.order_id,
                                source_type: record.source_type,
                                card_details: record.card_details,
                                processing_fee: record.processing_fee,
                                note: record.note,
                                receipt_number: record.receipt_number,
                                receipt_url: record.receipt_url,
                                delay_action: record.delay_action,
                                delayed_until: record.delayed_until,
                                team_member_id: record.team_member_id,
                                employee_id: record.employee_id,
                                version_token: record.version_token,
                                application_details: record.application_details
                            };
                        });

                        if (payments.length > 0) {
                            await nango.batchSave(payments, 'Payment');

                            const lastPayment = payments.at(-1);
                            if (lastPayment) {
                                lastProcessedUpdatedAt = lastPayment.updated_at;
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
