import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    begin_time: z.string().optional().describe('Start of the time range in RFC 3339 format. Defaults to current time minus one year.'),
    end_time: z.string().optional().describe('End of the time range in RFC 3339 format. Defaults to the current time.'),
    sort_order: z.string().optional().describe('Sort order: ASC or DESC. Default is DESC.'),
    location_id: z.string().optional().describe('Limit results to the supplied location ID.'),
    status: z.string().optional().describe('Filter by refund status: PENDING, COMPLETED, REJECTED, or FAILED.'),
    source_type: z.string().optional().describe('Filter by payment source type: CARD, BANK_ACCOUNT, WALLET, CASH, or EXTERNAL.'),
    limit: z.number().optional().describe('Maximum number of results per page. Default is 100, max is 100.'),
    updated_at_begin_time: z.string().optional().describe('Start of the updated_at time range in RFC 3339 format.'),
    updated_at_end_time: z.string().optional().describe('End of the updated_at time range in RFC 3339 format.'),
    sort_field: z.string().optional().describe('Field to sort by: CREATED_AT or UPDATED_AT. Default is CREATED_AT.')
});

const MoneySchema = z.object({
    amount: z.number().optional(),
    currency: z.string().optional()
});

const ProcessingFeeSchema = z.object({
    effective_at: z.string().optional(),
    type: z.string().optional(),
    amount_money: MoneySchema.optional()
});

const PaymentRefundSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    location_id: z.string().optional(),
    unlinked: z.boolean().optional(),
    destination_type: z.string().optional(),
    destination_details: z.record(z.string(), z.unknown()).optional(),
    amount_money: MoneySchema.optional(),
    app_fee_money: MoneySchema.optional(),
    app_fee_allocations: z.array(z.record(z.string(), z.unknown())).optional(),
    processing_fee: z.array(ProcessingFeeSchema).optional(),
    payment_id: z.string().optional(),
    order_id: z.string().optional(),
    reason: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    team_member_id: z.string().optional(),
    terminal_refund_id: z.string().optional()
});

const OutputSchema = z.object({
    refunds: z.array(PaymentRefundSchema),
    cursor: z.string().optional()
});

const action = createAction({
    description: 'List refunds.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['PAYMENTS_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['cursor'] = input.cursor;
        }
        if (input.begin_time !== undefined) {
            params['begin_time'] = input.begin_time;
        }
        if (input.end_time !== undefined) {
            params['end_time'] = input.end_time;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }
        if (input.location_id !== undefined) {
            params['location_id'] = input.location_id;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.source_type !== undefined) {
            params['source_type'] = input.source_type;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.updated_at_begin_time !== undefined) {
            params['updated_at_begin_time'] = input.updated_at_begin_time;
        }
        if (input.updated_at_end_time !== undefined) {
            params['updated_at_end_time'] = input.updated_at_end_time;
        }
        if (input.sort_field !== undefined) {
            params['sort_field'] = input.sort_field;
        }

        const response = await nango.get({
            // https://developer.squareup.com/reference/square/refunds-api/list-payment-refunds
            endpoint: '/v2/refunds',
            params,
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Square API.'
            });
        }

        const parsed = z
            .object({
                refunds: z.array(z.record(z.string(), z.unknown())).optional(),
                cursor: z.string().optional()
            })
            .parse(rawData);

        const refunds = (parsed.refunds || []).map((item) => {
            return PaymentRefundSchema.parse(item);
        });

        return {
            refunds,
            ...(parsed.cursor !== undefined && { cursor: parsed.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
