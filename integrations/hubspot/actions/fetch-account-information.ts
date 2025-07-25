import type { NangoAction, Account, ProxyConfiguration } from '../../models.js';
import type { HubspotAccountInformation } from '../types.js';

export default async function runAction(nango: NangoAction): Promise<Account> {
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
