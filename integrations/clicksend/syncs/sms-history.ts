import type { NangoSync, Sms, ProxyConfiguration } from '../../models';
import { toSms } from '../mappers/to-sms.js';
import type { ClickSendSms } from '../types.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const params: Record<string, any> = {};

    if (nango.lastSyncDate) {
        params['date_from'] = Math.floor(new Date(nango.lastSyncDate).getTime() / 1000);
    }

    const config: ProxyConfiguration = {
        // https://developers.clicksend.com/docs/messaging/sms/other/view-sms-history
        endpoint: '/v3/sms/history',
        method: 'GET',
        params,
        retries: 10,
        paginate: {
            type: 'link',
            response_path: 'data.data',
            link_path_in_response_body: 'data.next_page_url',
            limit: 100,
            limit_name_in_request: 'limit'
        }
    };

    for await (const clickSendSmsArray of nango.paginate<ClickSendSms>(config)) {
        if (!Array.isArray(clickSendSmsArray)) {
            throw new Error('Did not receive an expected array');
        }

        const smsArray: Sms[] = clickSendSmsArray.map(toSms);

        if (smsArray.length > 0) {
            await nango.batchSave(smsArray, 'Sms');
        }
    }
}
