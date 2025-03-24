import type { NangoSync, ProxyConfiguration } from '@nangohq/shared';
import type { BitdefenderCompanyResponse } from '../types';
import type { BitdefenderCompany } from '../../models';
import { toCompany } from '../mappers/to-company';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://cloud.bitdefender.com/sandbox/api/v1.0/jsonrpc/network
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
