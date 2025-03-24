import type { NangoSync, ProxyConfiguration } from '../../models';
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

export default async function fetchData(nango: NangoSync) {
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
    await nango.log(`Retrieved company details. Status: ${response.status}`);

    // Check for errors in the response
    if (response.data && response.data.error) {
        const errorMsg = `Error retrieving company details: ${response.data.error.message}`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    // Handle case where response.data is undefined or doesn't have expected structure
    if (!response.data || !response.data.result) {
        const errorMsg = `Error retrieving company details: Unexpected response format`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    if (response.data && response.data.result) {
        const result = response.data.result;

        // Check if result has the expected structure
        if (result && result.id) {
            const company: BitdefenderCompany = {
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

            await nango.batchSave([company], 'BitdefenderCompany');
        } else {
            await nango.log('Response data does not contain expected company structure');
        }
    }
}
