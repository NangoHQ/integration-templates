import type { NangoSync, ProxyConfiguration } from '../../models';
import type { BitdefenderQuarantineResponse } from '../types';

// Define the BitdefenderQuarantineItem type inline based on the model in nango.yaml
type BitdefenderQuarantineItem = {
    id: string;
    name: string;
    hash: string;
    filePath: string;
    endpointId: string;
    endpointName: string;
    date: string;
    malwareType: string;
    malwareName: string;
    moduleName: string;
    impact: number;
    size: number;
    isPasswordProtectedArchive: boolean;
    restored: boolean;
    deleted: boolean;
    raw_json: string;
};

export default async function fetchData(nango: NangoSync) {
    // Simplified implementation without pagination for initial testing
    const requestBody = {
        jsonrpc: '2.0',
        method: 'getQuarantineItemsList',
        params: {},
        id: Date.now().toString()
    };

    // https://www.bitdefender.com/business/support/en/77209-140256-getquarantineitemslist.html
    const config: ProxyConfiguration = {
        endpoint: 'v1.0/jsonrpc/network',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 10
    };

    const response = await nango.post<BitdefenderQuarantineResponse>(config);
    await nango.log(`Retrieved quarantine items list. Status: ${response.status}`);

    // Check for errors in the response
    if (response.data && response.data.error) {
        const errorMsg = `Error retrieving quarantine items list: ${response.data.error.message}`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    // Handle case where response.data is undefined or doesn't have expected structure
    if (!response.data || !response.data.result) {
        const errorMsg = `Error retrieving quarantine items list: Unexpected response format`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    if (response.data.result && response.data.result.items) {
        const quarantineItems: BitdefenderQuarantineItem[] = response.data.result.items.map((item) => ({
            id: item.id,
            name: item.name,
            hash: item.hash,
            filePath: item.filePath,
            endpointId: item.endpointId,
            endpointName: item.endpoint.name,
            date: item.date,
            malwareType: item.malwareType,
            malwareName: item.malwareName,
            moduleName: item.moduleName,
            impact: item.impact,
            size: item.size,
            isPasswordProtectedArchive: item.isPasswordProtectedArchive,
            restored: item.restored,
            deleted: item.deleted,
            raw_json: JSON.stringify(item)
        }));

        await nango.batchSave(quarantineItems, 'BitdefenderQuarantineItem');
    }
}
