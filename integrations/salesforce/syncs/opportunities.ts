import { createSync } from 'nango';
import { buildQuery } from '../utils.js';
import type { SalesforceOpportunity } from '../types.js';
import { toOpportunity } from '../mappers/toOpportunity.js';

import type { ProxyConfiguration } from 'nango';
import { Opportunity } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of opportunities from salesforce',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',

    endpoints: [
        {
            method: 'GET',
            path: '/opportunities',
            group: 'Opportunities'
        }
    ],

    scopes: ['offline_access', 'api'],

    models: {
        Opportunity: Opportunity
    },

    metadata: z.object({}),

    exec: async (nango) => {
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchAndSaveRecords(nango: NangoSyncLocal, query: string) {
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
        await nango.batchSave(mappedOpportunities, 'Opportunity');
    }
}
