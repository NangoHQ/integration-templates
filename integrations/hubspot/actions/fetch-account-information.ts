import { createAction } from 'nango';
import type { HubspotAccountInformation } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Account } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch the account information from Hubspot',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/account-information'
    },

    input: z.void(),
    output: Account,
    scopes: ['oauth'],

    exec: async (nango): Promise<Account> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/account-information-api
            endpoint: '/account-info/v3/details',
            retries: 3
        };

        const response = await nango.get<HubspotAccountInformation>(config);

        return {
            id: response.data.portalId.toString(),
            type: response.data.accountType,
            timeZone: response.data.timeZone,
            companyCurrency: response.data.companyCurrency,
            additionalCurrencies: response.data.additionalCurrencies,
            utcOffset: response.data.utcOffset,
            utcOffsetMilliseconds: response.data.utcOffsetMilliseconds,
            uiDomain: response.data.uiDomain,
            dataHostingLocation: response.data.dataHostingLocation
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
