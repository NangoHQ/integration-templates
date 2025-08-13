import { createSync } from 'nango';
import { buildQuery } from '../utils.js';
import type { SalesforceLead } from '../types.js';
import { toLead } from '../mappers/toLead.js';

import type { ProxyConfiguration } from 'nango';
import { Lead } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of leads from salesforce',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/leads',
            group: 'Leads'
        }
    ],

    scopes: ['offline_access', 'api'],

    models: {
        Lead: Lead
    },

    metadata: z.object({}),

    exec: async (nango) => {
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

    // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_lead.htm
    for await (const leads of nango.paginate<SalesforceLead>(proxyConfig)) {
        const mappedLeads = leads.map((lead: SalesforceLead) => toLead(lead));
        await nango.batchSave(mappedLeads, 'Lead');
    }
}
