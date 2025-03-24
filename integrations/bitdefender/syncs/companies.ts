import type { NangoSync, ProxyConfiguration } from '@nangohq/shared';
import type { BitdefenderCompanyResponse } from '../types';
import type { BitdefenderCompany } from '../../models';
import { toCompany } from '../mappers/to-company.js';

export default async function fetchData(nango: NangoSync) {
    // Documentation URL: https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
    const config: ProxyConfiguration = {
        // Documentation URL: https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
        endpoint: '/jsonrpc/network',
        method: 'POST',
        data: {
            params: {
                networkId: 0,
                page: {
                    from: 0,
                    to: 100
                }
            },
            method: 'getCompanyDetails',
            jsonrpc: '2.0',
            id: 1
        },
        retries: 10
    };

    const response = await nango.post<BitdefenderCompanyResponse>(config);

    if (!response.data.result) {
        throw new Error('No result found in response');
    }

    const company: BitdefenderCompany = toCompany(response.data.result);
    await nango.batchSave([company], 'BitdefenderCompany');
}
