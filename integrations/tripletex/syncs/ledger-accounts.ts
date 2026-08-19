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

const CheckpointSchema = z.object({
    from: z.number().int()
});

const sync = createSync({
    description: 'Sync the chart of accounts.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LedgerAccount: LedgerAccountSchema
    },

    exec: async (nango) => {
        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        // https://api-test.tripletex.tech/v2/swagger.json
        // Tripletex does not expose a changed-since filter for ledger accounts.
        // Full refresh with offset checkpoints is used so the crawl can resume
        // across executions and delete tracking runs after a complete pass.

        const checkpoint = await nango.getCheckpoint();

        const parsedCheckpoint = CheckpointSchema.parse({
            from: 0,
            ...(checkpoint ?? {})
        });

        await nango.trackDeletesStart('LedgerAccount');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            // https://api-test.tripletex.tech/v2/swagger.json
            endpoint: 'v2/ledger/account',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: parsedCheckpoint.from,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        const paginator = nango.paginate(proxyConfig);
        let result = await paginator.next();
        let currentFrom = parsedCheckpoint.from;

        while (!result.done) {
            if (!Array.isArray(result.value)) {
                throw new Error('Expected paginate page to be an array');
            }

            const parsedBatch = z.array(z.unknown()).safeParse(result.value);
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

            currentFrom += result.value.length;
            await nango.saveCheckpoint({ from: currentFrom });

            result = await paginator.next();
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LedgerAccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
