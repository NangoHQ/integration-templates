import { createAction } from 'nango';
import { createOpportunityInputSchema } from '../schema.zod.js';
import { toSalesForceOpportunity } from '../mappers/toOpportunity.js';

import type { ProxyConfiguration } from 'nango';
import { ActionResponse, CreateOpportunityInput } from '../models.js';

const action = createAction({
    description: 'Create a single opportunity in salesforce',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/opportunities',
        group: 'Opportunities'
    },

    input: CreateOpportunityInput,
    output: ActionResponse,
    scopes: ['offline_access', 'api'],

    exec: async (nango, input): Promise<ActionResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: createOpportunityInputSchema, input });

        const salesforceOpportunity = toSalesForceOpportunity(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_opportunity.htm
            endpoint: '/services/data/v60.0/sobjects/Opportunity',
            data: salesforceOpportunity,
            retries: 3
        };
        const response = await nango.post(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
