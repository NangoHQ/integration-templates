import type { NangoSync, ProxyConfiguration } from '../../models';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { mapXeroBankTransaction } from '../mappers/to-bank-transaction.js';
import type { XeroBankTransaction } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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
            page: 1,
            includeArchived: 'false'
        },
        retries: 10
    };

    await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

    // If it is an incremental sync, only fetch the changed bank transactions
    if (nango.lastSyncDate && config.headers) {
        config.params['includeArchived'] = 'true';
        config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
    }

    let page = 1;
    do {
        config.params['page'] = page;
        const res = await nango.get(config);
        const bankTransactions = res.data.BankTransactions;

        const activeBankTransactions = bankTransactions.filter((x: XeroBankTransaction) => x.Status === 'AUTHORISED');
        const mappedActiveBankTransactions = activeBankTransactions.map(mapXeroBankTransaction);
        await nango.batchSave(mappedActiveBankTransactions, 'BankTransaction');

        if (nango.lastSyncDate) {
            const deletedBankTransactions = bankTransactions.filter((x: XeroBankTransaction) => x.Status === 'DELETED');
            const mappedDeletedBankTransactions = deletedBankTransactions.map(mapXeroBankTransaction);
            await nango.batchDelete(mappedDeletedBankTransactions, 'BankTransaction');
        }

        // Should we still fetch the next page?
        page = bankTransactions.length < 100 ? -1 : page + 1;
    } while (page != -1);
}
