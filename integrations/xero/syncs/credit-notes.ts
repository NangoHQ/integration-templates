import type { NangoSync, ProxyConfiguration } from '../../models';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toCreditNote } from '../mappers/to-credit-note.js';

interface Config extends ProxyConfiguration {
    params: Record<string, string | number>;
}

export default async function fetchData(nango: NangoSync): Promise<void> {
    const tenant_id = await getTenantId(nango);

    const config: Config = {
        endpoint: 'api.xro/2.0/CreditNotes',
        headers: {
            'xero-tenant-id': tenant_id,
            'If-Modified-Since': ''
        },
        params: {
            includeArchived: 'false'
        },
        retries: 10,
        paginate: {
            type: 'offset',
            response_path: 'CreditNotes',
            limit: 1000,
            offset_name_in_request: 'page',
            limit_name_in_request: 'pageSize',
            offset_calculation_method: 'per-page'
        }
    };

    await nango.log(`Last sync date - type: ${typeof nango.lastSyncDate} JSON value: ${JSON.stringify(nango.lastSyncDate)}`);

    if (nango.lastSyncDate && config.params && config.headers) {
        config.params['includeArchived'] = 'true';
        config.headers['If-Modified-Since'] = nango.lastSyncDate.toISOString().replace(/\.\d{3}Z$/, ''); // Returns yyyy-mm-ddThh:mm:ss
    }

    for await (const creditNotes of nango.paginate(config)) {
        const activeCreditNotes = creditNotes.filter((x: any) => x.Status !== 'DELETED' && x.Status !== 'VOIDED');
        const mappedActiveCreditNotes = activeCreditNotes.map(toCreditNote);
        await nango.batchSave(mappedActiveCreditNotes, 'CreditNote');

        if (nango.lastSyncDate) {
            const archivedCreditNotes = creditNotes.filter((x: any) => x.Status === 'DELETED' || x.Status === 'VOIDED');
            const mappedArchivedCreditNotes = archivedCreditNotes.map(toCreditNote);
            await nango.batchDelete(mappedArchivedCreditNotes, 'CreditNote');
        }
    }
}
