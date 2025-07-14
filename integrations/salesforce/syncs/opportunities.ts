import type { NangoSync, ProxyConfiguration, Opportunity } from '../../models.js';
import { buildQuery } from '../utils.js';
import type { SalesforceOpportunity } from '../types.js';
import { toOpportunity } from '../mappers/toOpportunity.js';

export default async function fetchData(nango: NangoSync) {
    const fields = [
        'Id',
        'Name',
        'AccountId',
        'Account.Name',
        'Amount',
        'Description',
        'CloseDate',
        'CreatedById',
        'CreatedBy.Name',
        'OwnerId',
        'Owner.Name',
        'StageName',
        'Probability',
        'Type',
        'LastModifiedDate'
    ];
    const query = buildQuery('Opportunity', fields, nango.lastSyncDate);

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

    // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
    for await (const opportunities of nango.paginate<SalesforceOpportunity>(proxyConfig)) {
        const mappedOpportunities = opportunities.map((opportunity: SalesforceOpportunity) => toOpportunity(opportunity));
        await nango.batchSave<Opportunity>(mappedOpportunities, 'Opportunity');
    }
}
