import { createSync } from 'nango';
import type { HubspotCurrencyCodeResponse, HubspotCompanyCode } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { CurrencyCode } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetch hubspot deals',
    version: '2.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/currency-codes'
        }
    ],

    scopes: ['oauth', 'settings.currencies.read'],

    models: {
        CurrencyCode: CurrencyCode
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/settings/currencies
            endpoint: '/settings/v3/currencies/codes',
            retries: 10
        };

        const response = await nango.get<HubspotCurrencyCodeResponse>(config);

        const codes = response.data.results.map((result: HubspotCompanyCode) => {
            return {
                id: result.currencyCode,
                code: result.currencyCode,
                description: result.currencyName
            };
        });

        await nango.batchSave(codes, 'CurrencyCode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
