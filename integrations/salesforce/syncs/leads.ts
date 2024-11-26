import type { NangoSync, Lead, ProxyConfiguration } from '../../models';
import { buildQuery } from '../utils.js';
import type { SalesforceLead } from '../types';
import { toLead } from '../mappers/toLead.js';

export default async function fetchData(nango: NangoSync) {
    const fields = [
        'Id',
        'FirstName',
        'LastName',
        'Company',
        'Email',
        'Title',
        'Salutation',
        'Website',
        'Industry',
        'LastModifiedDate',
        'OwnerId',
        'Owner.Name',
        'Phone'
    ];
    const query = buildQuery('Lead', fields, nango.lastSyncDate);

    await fetchAndSaveRecords(nango, query);
}

async function fetchAndSaveRecords(nango: NangoSync, query: string) {
    const endpoint = '/services/data/v60.0/query';

    const proxyConfig: ProxyConfiguration = {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm
        endpoint,
        retries: 10,
        params: { q: query },
        paginate: {
            type: 'link',
            response_path: 'records',
            link_path_in_response_body: 'nextRecordsUrl'
        }
    };

    // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
    for await (const leads of nango.paginate<SalesforceLead>(proxyConfig)) {
        const mappedLeads = leads.map((lead: SalesforceLead) => toLead(lead));
        await nango.batchSave<Lead>(mappedLeads, 'Lead');
    }
}
