import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PaymentSchema = z.object({
    id: z.string(),
    Account: z.string().optional(),
    AmountDC: z.number().optional(),
    Description: z.string().optional(),
    PaymentReference: z.string().optional(),
    Modified: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z
            .array(
                z.object({
                    CurrentDivision: z.number()
                })
            )
            .nonempty()
    })
});

const PaymentRecordSchema = z.object({
    ID: z.string(),
    Account: z.string().nullish(),
    AmountDC: z.number().nullish(),
    Description: z.string().nullish(),
    PaymentReference: z.string().nullish(),
    Modified: z.string().nullish()
});

const sync = createSync({
    description: 'Sync outgoing payments from the cashflow module.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/payments'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://start.exactonline.fr/docs/services/current/Me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error(`Unable to resolve current division from /api/v1/current/Me: ${meParsed.error.message}`);
        }

        const results = meParsed.data.d.results;
        if (results[0] === undefined) {
            throw new Error('Unable to resolve current division from /api/v1/current/Me');
        }
        const division = results[0].CurrentDivision;

        const proxyConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/services/cashflow/Payments
            endpoint: `/api/v1/${encodeURIComponent(division)}/cashflow/Payments`,
            params: {
                $select: 'ID,Account,AmountDC,Description,PaymentReference,Modified',
                $orderby: 'Modified asc',
                ...(checkpoint &&
                    checkpoint['updated_after'] && {
                        $filter: `Modified ge datetime'${checkpoint['updated_after']}'`
                    })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'd.__next',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const payments = [];
            for (const record of page) {
                const parsed = PaymentRecordSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse payment record: ${parsed.error.message}`);
                }

                const p = parsed.data;
                payments.push({
                    id: p.ID,
                    ...(p.Account != null && { Account: p.Account }),
                    ...(p.AmountDC != null && { AmountDC: p.AmountDC }),
                    ...(p.Description != null && { Description: p.Description }),
                    ...(p.PaymentReference != null && { PaymentReference: p.PaymentReference }),
                    ...(p.Modified != null && { Modified: p.Modified })
                });
            }

            if (payments.length === 0) {
                continue;
            }

            await nango.batchSave(payments, 'Payment');

            const lastPayment = payments[payments.length - 1];
            if (lastPayment && lastPayment.Modified) {
                await nango.saveCheckpoint({
                    updated_after: lastPayment.Modified
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
