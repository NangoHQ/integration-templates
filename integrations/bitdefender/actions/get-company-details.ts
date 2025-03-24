import type { NangoAction, ProxyConfiguration, BitdefenderCompany } from '../../models';
import type { BitdefenderCompanyResponse } from '../types';
import { toCompany } from '../mappers/to-company.js';

export default async function runAction(nango: NangoAction): Promise<BitdefenderCompany> {
    // No input needed for this action as it retrieves the current company details
    // The API doesn't accept an ID parameter for getCompanyDetails

    const requestBody = {
        jsonrpc: '2.0',
        method: 'getCompanyDetails',
        params: {},
        id: Date.now().toString()
    };

    // Documentation URL: https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
    const config: ProxyConfiguration = {
        // Documentation URL: https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
        endpoint: 'v1.0/jsonrpc/companies',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 3 // Default for actions is 3 retries
    };

    const response = await nango.post<BitdefenderCompanyResponse>(config);

    // Check for errors in the response
    if (response.data.error) {
        throw new nango.ActionError({
            message: `Error retrieving company details: ${response.data.error.message}`,
            details: JSON.stringify(response.data.error)
        });
    }

    if (!response.data.result) {
        throw new nango.ActionError({
            message: 'No company details found',
            details: 'The API response did not include any company details'
        });
    }

    return toCompany(response.data.result);
}
