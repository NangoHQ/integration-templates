import type { NangoSync, ProxyConfiguration, CurrencyCode } from '../../models.js';
import type { HubspotCurrencyCodeResponse, HubspotCompanyCode } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
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

    await nango.batchSave<CurrencyCode>(codes, 'CurrencyCode');
}
