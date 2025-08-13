import { createAction } from 'nango';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

import type { ProxyConfiguration } from 'nango';
import { CreateUpdateDealOutput, CreateDealInput } from '../models.js';

const action = createAction({
    description: 'Creates a single deal in Hubspot',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/deals',
        group: 'Deals'
    },

    input: CreateDealInput,
    output: CreateUpdateDealOutput,
    scopes: ['oauth', 'crm.objects.deals.write', 'oauth'],

    exec: async (nango, input): Promise<CreateUpdateDealOutput> => {
        const hubSpotDeal = toHubspotDeal(input);
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/deals#create-deals
            endpoint: 'crm/v3/objects/deals',
            data: hubSpotDeal,
            retries: 3
        };

        const response = await nango.post(config);

        return createUpdateDeal(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
