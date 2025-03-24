import type { NangoAction, ProxyConfiguration } from '../../models';
import type { BitdefenderCompanyResponse } from '../types';

// Define the BitdefenderCompany type inline based on the model in nango.yaml
type BitdefenderCompany = {
    id: string;
    name: string;
    type: number;
    country: string | undefined;
    createdAt: string;
    subscribedServices: {
        endpoint: boolean;
        exchange: boolean;
        network: boolean;
        sos: boolean;
    };
    raw_json: string;
};

export default async function runAction(nango: NangoAction): Promise<BitdefenderCompany> {
    // No input needed for this action as it retrieves the current company details
    // The API doesn't accept an ID parameter for getCompanyDetails

    const requestBody = {
        jsonrpc: '2.0',
        method: 'getCompanyDetails',
        params: {},
        id: Date.now().toString()
    };

    // https://www.bitdefender.com/business/support/en/77209-126239-getcompanydetails.html
    const config: ProxyConfiguration = {
        endpoint: 'v1.0/jsonrpc/companies',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 10
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

    const result = response.data.result;

    return {
        id: result.id,
        name: result.name,
        type: Number(result.type),
        country: result.country,
        createdAt: result.createdAt,
        subscribedServices: {
            endpoint: result.subscribedServices ? result.subscribedServices.endpoint : false,
            exchange: result.subscribedServices ? result.subscribedServices.exchange : false,
            network: result.subscribedServices ? result.subscribedServices.network : false,
            sos: result.subscribedServices ? result.subscribedServices.sos : false
        },
        raw_json: JSON.stringify(result)
    };
}
