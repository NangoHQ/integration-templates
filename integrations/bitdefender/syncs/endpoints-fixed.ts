import type { NangoSync, ProxyConfiguration } from '../../models';
import type { BitdefenderEndpointResponse } from '../types';

// Define the BitdefenderEndpoint type inline based on the model in nango.yaml
type BitdefenderEndpoint = {
    id: string;
    name: string;
    fqdn: string;
    groupId: string;
    isManaged: boolean;
    machineType: number;
    os: {
        type: string;
        version: string;
        displayName: string;
    };
    ip: string[];
    macs: string[];
    ssid: string | undefined;
    label: string | undefined;
    state: {
        managedWithClient: boolean;
        managedWithoutClient: boolean;
        pendingUninstall: boolean;
        needsReboot: boolean;
        canManage: boolean;
        agentVersion: string;
        lastUpdate: string;
        online: boolean;
    };
    raw_json: string;
};

export default async function fetchData(nango: NangoSync) {
    // Simplified implementation without pagination for initial testing
    const requestBody = {
        jsonrpc: '2.0',
        method: 'getEndpointsList',
        params: {
            page: {
                perPage: 1, // Set to 1 for pagination testing
                currentPage: 1
            }
        },
        id: Date.now().toString()
    };

    // https://www.bitdefender.com/business/support/en/77209-128477-getendpointslist.html
    const config: ProxyConfiguration = {
        endpoint: 'v1.0/jsonrpc/network',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 10
    };

    const response = await nango.post<BitdefenderEndpointResponse>(config);
    await nango.log(`Retrieved endpoints list. Status: ${response.status}. Testing pagination with perPage=1`);

    // Check for errors in the response
    if (response.data && response.data.error) {
        const errorMsg = `Error retrieving endpoints list: ${response.data.error.message}`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    // Handle case where response.data is undefined or doesn't have expected structure
    if (!response.data || !response.data.result) {
        const errorMsg = `Error retrieving endpoints list: Unexpected response format`;
        await nango.log(errorMsg);
        throw new Error(errorMsg);
    }

    if (response.data.result && response.data.result.items) {
        const endpoints: BitdefenderEndpoint[] = response.data.result.items.map((item) => ({
            id: item.id,
            name: item.name,
            fqdn: item.fqdn,
            groupId: item.groupId,
            isManaged: item.isManaged,
            machineType: item.machineType,
            os: {
                type: item.os.type,
                version: item.os.version,
                displayName: item.os.displayName
            },
            ip: item.ip,
            macs: item.macs,
            ssid: item.ssid,
            label: item.label,
            state: {
                managedWithClient: item.state.managedWithClient,
                managedWithoutClient: item.state.managedWithoutClient,
                pendingUninstall: item.state.pendingUninstall,
                needsReboot: item.state.needsReboot,
                canManage: item.state.canManage,
                agentVersion: item.state.agentVersion,
                lastUpdate: item.state.lastUpdate,
                online: item.state.online
            },
            raw_json: JSON.stringify(item)
        }));

        await nango.batchSave(endpoints, 'BitdefenderEndpoint');

        // Log pagination information if available
        if (response.data.result.page) {
            const page = response.data.result.page;
            await nango.log(
                `Pagination info - Current page: ${page.currentPage}, Total pages: ${page.pagesCount}, Items per page: ${page.perPage}, Total items: ${page.allItemsCount}`
            );
        }
    }
}
