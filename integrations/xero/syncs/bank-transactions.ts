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
