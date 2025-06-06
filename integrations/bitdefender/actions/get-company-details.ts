import type { NangoAction, ProxyConfiguration } from '../../models';
import type { BitdefenderCompanyResponse } from '../types';
import { toCompany } from '../mappers/to-company.js';

export default async function runAction(nango: NangoAction) {
    const config: ProxyConfiguration = {
        // https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
        endpoint: 'v1.0/jsonrpc/companies',
        data: {
            jsonrpc: '2.0',
            method: 'getCompanyDetails',
            params: {},
            id: Date.now().toString()
        },
        retries: 3
    };

    const response = await nango.post<BitdefenderCompanyResponse>(config);
    await nango.log(`Retrieved company details. Status: ${response.status}`);

    // Check for errors in the response
    if (response.data && response.data.error) {
        throw new nango.ActionError({
            message: `Error retrieving company details: ${response.data.error.message}`,
            details: JSON.stringify(response.data.error)
        });
    }

    if (!response.data.result) {
        throw new nango.ActionError({
            message: 'No result found in response',
            details: 'The API response did not contain the expected company details'
        });
    }

    return toCompany(response.data.result);
}
