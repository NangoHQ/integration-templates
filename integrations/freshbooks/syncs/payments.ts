import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MoneySchema = z.object({
    amount: z.string(),
    code: z.string()
});

const ProviderPaymentSchema = z.object({
    id: z.union([z.string(), z.number()]),
    date: z.string().optional(),
    amount: MoneySchema.nullable().optional(),
    type: z.string().optional(),
    clientid: z.union([z.string(), z.number()]).nullable().optional(),
    invoiceid: z.union([z.string(), z.number()]).nullable().optional(),
    creditid: z.union([z.string(), z.number()]).nullable().optional(),
    note: z.string().nullable().optional(),
    vis_state: z.number().optional(),
    updated: z.string().optional(),
    from_credit: z.boolean().optional(),
    gateway: z.string().nullable().optional()
});

const PaymentModelSchema = z.object({
    id: z.string(),
    date: z.string().optional(),
    amount: z.string().optional(),
    currency_code: z.string().optional(),
    type: z.string().optional(),
    clientid: z.string().optional(),
    invoiceid: z.string().optional(),
    creditid: z.string().optional(),
    note: z.string().optional(),
    vis_state: z.number().optional(),
    updated: z.string().optional(),
    from_credit: z.boolean().optional(),
    gateway: z.string().optional()
});

const sync = createSync({
    description: 'Sync payments.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Payment: PaymentModelSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        if (!metadata?.accountId) {
            throw new Error('accountId is required in connection metadata');
        }

        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const params: Record<string, string> = {
            per_page: '100'
        };
        if (updatedAfter) {
            params['search[updated_since]'] = updatedAfter.replace(' ', 'T');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/payments
            endpoint: `/accounting/account/${encodeURIComponent(metadata.accountId)}/payments/payments`,
            params: {
                sort: 'updated:asc',
                ...params
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'response.result.payments'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const payments: z.infer<typeof PaymentModelSchema>[] = [];
            let maxUpdated: string | undefined;

            for (const raw of page) {
                const parsed = ProviderPaymentSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse payment: ${parsed.error.message}`);
                }
                const p = parsed.data;
                payments.push({
                    id: String(p.id),
                    ...(p.date != null && { date: p.date }),
                    ...(p.amount != null && { amount: p.amount.amount, currency_code: p.amount.code }),
                    ...(p.type != null && { type: p.type }),
                    ...(p.clientid != null && { clientid: String(p.clientid) }),
                    ...(p.invoiceid != null && { invoiceid: String(p.invoiceid) }),
                    ...(p.creditid != null && { creditid: String(p.creditid) }),
                    ...(p.note != null && { note: p.note }),
                    ...(p.vis_state != null && { vis_state: p.vis_state }),
                    ...(p.updated != null && { updated: p.updated }),
                    ...(p.from_credit != null && { from_credit: p.from_credit }),
                    ...(p.gateway != null && { gateway: p.gateway })
                });

                if (p.updated) {
                    const formatted = p.updated.replace(' ', 'T');
                    if (maxUpdated === undefined || formatted > maxUpdated) {
                        maxUpdated = formatted;
                    }
                }
            }

            if (payments.length === 0) {
                continue;
            }

            await nango.batchSave(payments, 'Payment');

            if (maxUpdated) {
                await nango.saveCheckpoint({
                    updated_after: maxUpdated
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
