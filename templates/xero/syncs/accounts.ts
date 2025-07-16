import { createSync } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';

import type { ProxyConfiguration } from "nango";
import { Account } from "../models.js";
import { z } from "zod";

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

const sync = createSync({
    description: "Fetches all accounts in Xero (chart of accounts). Incremental sync, detects deletes, metadata is not required.",
    version: "1.0.5",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/accounts",
        group: "Accounts"
    }],

    scopes: ["accounting.settings"],

    models: {
        Account: Account
    },

    metadata: z.object({}),

    exec: async nango => {
        const tenant_id = await getTenantId(nango);

        const config: Config = {
            endpoint: 'api.xro/2.0/Accounts',
            headers: {
                'xero-tenant-id': tenant_id,
                'If-Modified-Since': ''
            },
            params: {
                order: 'UpdatedDateUTC DESC'
            },
            retries: 10
        };

        // If it is an incremental sync, only fetch the changed accounts
        if (nango.lastSyncDate && config.headers) {
            config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
        }

        const res = await nango.get(config);
        const accounts = res.data.Accounts;

        // Save active accounts
        const activeAccounts = accounts.filter((x: any) => x.Status === 'ACTIVE');
        const mappedActiveContacts = activeAccounts.map(mapXeroAccount);
        await nango.batchSave(mappedActiveContacts, 'Account');

        // If it is an incremental refresh, mark archived contacts as deleted
        if (nango.lastSyncDate) {
            const archivedAccounts = accounts.filter((x: any) => x.Status === 'ARCHIVED');
            const mappedArchivedAccounts = archivedAccounts.map(mapXeroAccount);
            await nango.batchDelete(mappedArchivedAccounts, 'Account');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;

/**
 * Maps a Xero account to the Account model
 * @param xeroAccount - The raw account data from Xero's API
 * @returns Account - The mapped account object with standard fields
 */
function mapXeroAccount(xeroAccount: any): Account {
    return {
        id: xeroAccount.AccountID,
        code: xeroAccount.Code,
        name: xeroAccount.Name,
        type: xeroAccount.Type,
        tax_type: xeroAccount.TaxType,
        description: xeroAccount.Description ?? null,
        class: xeroAccount.Class,
        bank_account_type: xeroAccount.BankAccountType,
        reporting_code: xeroAccount.ReportingCode,
        reporting_code_name: xeroAccount.ReportingCodeName,
        ...(xeroAccount.CurrencyCode && { currency_code: xeroAccount.CurrencyCode })
    };
}
