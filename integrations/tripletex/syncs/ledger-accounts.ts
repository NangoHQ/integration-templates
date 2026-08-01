import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderAccountSchema = z.object({
    id: z.number().int(),
    version: z.number().int().optional(),
    url: z.string().optional(),
    number: z.number().int(),
    numberPretty: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    ledgerType: z.string().optional(),
    balanceGroup: z.string().optional(),
    vatLocked: z.boolean().optional(),
    isCloseable: z.boolean().optional(),
    isApplicableForSupplierInvoice: z.boolean().optional(),
    requireReconciliation: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    isBankAccount: z.boolean().optional(),
    isPaymentAccount: z.boolean().optional()
});

const LedgerAccountSchema = z.object({
    id: z.string(),
    number: z.number().int(),
    name: z.string(),
    description: z.string().optional(),
    accountType: z.string().optional(),
    ledgerType: z.string().optional(),
    balanceGroup: z.string().optional(),
    isInactive: z.boolean().optional(),
    isBankAccount: z.boolean().optional(),
    isCloseable: z.boolean().optional(),
    requireReconciliation: z.boolean().optional(),
    vatLocked: z.boolean().optional(),
    isApplicableForSupplierInvoice: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync the chart of accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LedgerAccount: LedgerAccountSchema
    },

    exec: async (nango) => {
        // Blocker: Tripletex does not expose a changed-since filter for ledger accounts,
        // and delete tracking requires starting from page 1 every run, so pagination
        // checkpoints are invalid here. Full refresh is the only viable strategy.

        await nango.trackDeletesStart('LedgerAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            // https://api-test.tripletex.tech/v2/swagger.json
            endpoint: 'v2/ledger/account',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsedBatch = z.array(z.unknown()).safeParse(batch);
            if (!parsedBatch.success) {
                throw new Error(`Failed to parse ledger account batch: ${parsedBatch.error.message}`);
            }

            const accounts: z.infer<typeof LedgerAccountSchema>[] = [];

            for (const raw of parsedBatch.data) {
                const parsedItem = ProviderAccountSchema.safeParse(raw);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse ledger account item: ${parsedItem.error.message}`);
                }

                const account = parsedItem.data;

                accounts.push({
                    id: String(account.id),
                    number: account.number,
                    name: account.name,
                    ...(account.description != null && { description: account.description }),
                    ...(account.type != null && { accountType: account.type }),
                    ...(account.ledgerType != null && { ledgerType: account.ledgerType }),
                    ...(account.balanceGroup != null && { balanceGroup: account.balanceGroup }),
                    ...(account.isInactive != null && { isInactive: account.isInactive }),
                    ...(account.isBankAccount != null && { isBankAccount: account.isBankAccount }),
                    ...(account.isCloseable != null && { isCloseable: account.isCloseable }),
                    ...(account.requireReconciliation != null && { requireReconciliation: account.requireReconciliation }),
                    ...(account.vatLocked != null && { vatLocked: account.vatLocked }),
                    ...(account.isApplicableForSupplierInvoice != null && { isApplicableForSupplierInvoice: account.isApplicableForSupplierInvoice })
                });
            }

            if (accounts.length > 0) {
                await nango.batchSave(accounts, 'LedgerAccount');
            }
        }

        await nango.trackDeletesEnd('LedgerAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
