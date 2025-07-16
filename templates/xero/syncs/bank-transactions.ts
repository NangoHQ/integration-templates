import { createSync } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { mapXeroBankTransaction } from '../mappers/to-bank-transaction.js';
import type { XeroBankTransaction } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { BankTransaction } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "Fetches all bank transactions in Xero. Incremental sync, detects deletes, metadata is not required.",
    version: "2.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/bank-transactions",
        group: "Bank Transactions"
    }],

    scopes: ["accounting.transactions"],

    models: {
        BankTransaction: BankTransaction
    },

    metadata: z.object({}),

    exec: async nango => {
        const tenant_id = await getTenantId(nango);
        interface Config extends ProxyConfiguration {
            params: Record<string, string | number>;
        }

        const config: Config = {
            // https://developer.xero.com/documentation/api/accounting/banktransactions
            endpoint: 'api.xro/2.0/BankTransactions',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            params: {
                includeArchived: 'false',
                pageSize: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                response_path: 'BankTransactions',
                offset_calculation_method: 'per-page',
                offset_start_value: 1
            },
            retries: 10
        };

        await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

        // If it is an incremental sync, only fetch the changed bank transactions
        if (nango.lastSyncDate && config.headers) {
            config.params['includeArchived'] = 'true';
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        for await (const bankTransactions of nango.paginate(config)) {
            const activeBankTransactions = bankTransactions.filter((x: XeroBankTransaction) => x.Status === 'AUTHORISED');
            const mappedActiveBankTransactions = activeBankTransactions.map(mapXeroBankTransaction);
            await nango.batchSave(mappedActiveBankTransactions, 'BankTransaction');

            if (nango.lastSyncDate) {
                const deletedBankTransactions = bankTransactions.filter((x: XeroBankTransaction) => x.Status === 'DELETED');
                const mappedDeletedBankTransactions = deletedBankTransactions.map(mapXeroBankTransaction);
                await nango.batchDelete(mappedDeletedBankTransactions, 'BankTransaction');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
