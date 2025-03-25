import type { NangoAction, NangoSync, ProxyConfiguration } from '@nangohq/shared';

export interface BitdefenderJsonRpcRequest {
    jsonrpc: string;
    method: string;
    params: Record<string, any>;
    id: string;
}

export interface BitdefenderJsonRpcResponse {
    jsonrpc: string;
    id: string;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

export interface BitdefenderCompanyResponse extends BitdefenderJsonRpcResponse {
    result: {
        id: string;
        name: string;
        country?: string;
        type: number;
        subscribedServices: {
            endpoint: boolean;
            exchange: boolean;
            network: boolean;
            sos: boolean;
        };
    };
}
