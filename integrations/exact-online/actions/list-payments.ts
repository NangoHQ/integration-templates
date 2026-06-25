import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderPaymentSchema = z.object({
    ID: z.string().uuid(),
    Account: z.string().nullable().optional(),
    AccountName: z.string().nullable().optional(),
    AmountDC: z.number().nullable().optional(),
    EntryDate: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    PaymentReference: z.string().nullable().optional()
});

const PaymentSchema = z.object({
    ID: z.string().uuid(),
    Account: z.string().optional(),
    AccountName: z.string().optional(),
    AmountDC: z.number().optional(),
    EntryDate: z.string().optional(),
    Description: z.string().optional(),
    PaymentReference: z.string().optional()
});

const OutputSchema = z.object({
    Items: z.array(PaymentSchema),
    NextCursor: z.string().optional()
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.number().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const PaymentsResponseSchema = z.object({
    d: z
        .union([
            z.array(z.unknown()),
            z.object({
                results: z.array(z.unknown()).optional(),
                __next: z.string().optional()
            })
        ])
        .optional()
});

const action = createAction({
    description: 'List outgoing payments from the cashflow module.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Financial cashflow'],
    endpoint: {
        path: '/actions/list-payments',
        method: 'GET'
    },
    exec: async (nango, input) => {
        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=SystemSystemMe
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const division = meData.d?.results?.[0]?.CurrentDivision;

        if (division === undefined || division === null) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Unable to determine current division from Me response.'
            });
        }

        const pageSize = 60;
        let skip = 0;
        if (input.cursor) {
            const parsed = Number(input.cursor);
            if (!Number.isInteger(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            skip = parsed;
        }

        const params = {
            $select: 'ID,Account,AccountName,AmountDC,EntryDate,Description,PaymentReference',
            $top: pageSize,
            ...(skip > 0 && { $skip: skip })
        };

        // https://start.exactonline.nl/docs/HlpRestAPIResourcesDetails.aspx?name=CashflowPayments
        const paymentsResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/cashflow/Payments`,
            params,
            retries: 3
        });

        const paymentsData = PaymentsResponseSchema.parse(paymentsResponse.data);

        let rawResults: unknown[] = [];
        let nextLink: string | undefined;
        if (Array.isArray(paymentsData.d)) {
            rawResults = paymentsData.d;
        } else if (paymentsData.d !== undefined && paymentsData.d !== null) {
            rawResults = paymentsData.d.results ?? [];
            nextLink = paymentsData.d.__next;
        }

        const items = rawResults.map((item: unknown) => {
            const parsed = ProviderPaymentSchema.parse(item);
            return {
                ID: parsed.ID,
                ...(parsed.Account != null && { Account: parsed.Account }),
                ...(parsed.AccountName != null && { AccountName: parsed.AccountName }),
                ...(parsed.AmountDC != null && { AmountDC: parsed.AmountDC }),
                ...(parsed.EntryDate != null && { EntryDate: parsed.EntryDate }),
                ...(parsed.Description != null && { Description: parsed.Description }),
                ...(parsed.PaymentReference != null && { PaymentReference: parsed.PaymentReference })
            };
        });

        let nextCursor: string | undefined;
        if (nextLink) {
            const url = new URL(nextLink);
            const nextSkip = url.searchParams.get('$skip');
            if (nextSkip) {
                nextCursor = nextSkip;
            }
        }

        return {
            Items: items,
            ...(nextCursor !== undefined && { NextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
