// Base interface for JSON-RPC 2.0 requests
export interface BitdefenderJsonRpcRequest {
    jsonrpc: string;
    method: string;
    params: Record<string, any>;
    id: string | number;
}

// Base interface for JSON-RPC 2.0 responses
export interface BitdefenderJsonRpcResponse {
    jsonrpc: string;
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

// Company details response
export interface BitdefenderCompanyResponse extends BitdefenderJsonRpcResponse {
    result?: {
        id: string;
        name: string;
        parentId: string;
        type: string;
        uniqueId?: string;
        timezone: string;
        country?: string;
        createdAt: string;
        level: number;
        lcid: number;
        billType: string;
        integrationServicesEnabled: boolean;
        subscribedServices: {
            endpoint: boolean;
            exchange: boolean;
            network: boolean;
            sos: boolean;
        };
    };
}

// Endpoints list response
export interface BitdefenderEndpointResponse extends BitdefenderJsonRpcResponse {
    result?: {
        items: Array<{
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
            ip: Array<string>;
            macs: Array<string>;
            ssid?: string;
            label?: string;
            sensorId?: string;
            state: {
                managedWithClient: boolean;
                managedWithoutClient: boolean;
                pendingUninstall: boolean;
                needsReboot: boolean;
                canManage: boolean;
                agentVersion: string;
                lastUpdate: string;
                online: boolean;
                productStates: Record<string, any>;
            };
        }>;
        page: {
            allItemsCount: number;
            currentPage: number;
            perPage: number;
            pagesCount: number;
        };
    };
}

// Quarantine items list response
export interface BitdefenderQuarantineResponse extends BitdefenderJsonRpcResponse {
    result?: {
        items: Array<{
            id: string;
            name: string;
            hash: string;
            filePath: string;
            endpointId: string;
            endpoint: {
                id: string;
                name: string;
                fqdn: string;
                ip: Array<string>;
                groupId: string;
                isManaged: boolean;
                machineType: number;
                os: {
                    type: string;
                    version: string;
                    displayName: string;
                };
            };
            date: string;
            malwareType: string;
            malwareName: string;
            moduleId: number;
            moduleName: string;
            impact: number;
            size: number;
            isPasswordProtectedArchive: boolean;
            restored: boolean;
            deleted: boolean;
        }>;
        page: {
            allItemsCount: number;
            currentPage: number;
            perPage: number;
            pagesCount: number;
        };
    };
}
