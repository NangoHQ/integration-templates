import type { NangoSync, ProxyConfiguration } from '../../models';
import type { BitdefenderEndpointResponse } from '../types';

// Define the BitdefenderEndpoint interface inline based on the model in nango.yaml
interface BitdefenderEndpoint {
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
}

export default async function fetchData(nango: NangoSync) {
    // Testing pagination with a small page size
    const perPage = 1; // Set to 1 for pagination testing
    let currentPage = 1;
    let totalPages = 1;
    let allEndpoints: BitdefenderEndpoint[] = [];

    do {
        await nango.log(`Fetching page ${currentPage} of endpoints (limit: ${perPage})`);

        const requestBody = {
            jsonrpc: '2.0',
            method: 'getEndpointsList',
            params: {
                page: {
                    perPage: perPage,
                    currentPage: currentPage
                }
            },
            id: Date.now().toString()
        };

        // Endpoint documentation: https://www.bitdefender.com/business/support/en/77209-128477-getendpointslist.html
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
        await nango.log(`Retrieved endpoints list. Status: ${response.status}. Page: ${currentPage}`);

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

            allEndpoints = [...allEndpoints, ...endpoints];

            // Update pagination information
            if (response.data.result.page) {
                totalPages = response.data.result.page.pagesCount;
                await nango.log(`Pagination info - Current page: ${currentPage}, Total pages: ${totalPages}, Items on this page: ${endpoints.length}`);
                currentPage++;
            } else {
                // If no pagination info is available, exit the loop
                await nango.log('No pagination information available, exiting pagination loop');
                break;
            }
        } else {
            // No items found, exit the loop
            await nango.log('No endpoints found in the response');
            break;
        }
    } while (currentPage <= totalPages);

    // Save all endpoints at once
    if (allEndpoints.length > 0) {
        await nango.log(`Saving ${allEndpoints.length} endpoints`);
        await nango.batchSave(allEndpoints, 'BitdefenderEndpoint');
    } else {
        await nango.log('No endpoints to save');
    }
}
