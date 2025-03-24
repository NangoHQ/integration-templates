import type { NangoAction, ProxyConfiguration } from '../../models';
import type { BitdefenderJsonRpcResponse } from '../types';

// Define the QuarantineItemIdInput type inline based on the model in nango.yaml
type QuarantineItemIdInput = {
    id: string;
};

// Define the RestoreQuarantineItemOutput type inline based on the model in nango.yaml
type RestoreQuarantineItemOutput = {
    success: boolean;
    message?: string;
    raw_json: string;
};

export default async function runAction(nango: NangoAction, input: QuarantineItemIdInput): Promise<RestoreQuarantineItemOutput> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'Quarantine item ID is required'
        });
    }

    const requestBody = {
        jsonrpc: '2.0',
        method: 'restoreQuarantineItem',
        params: {
            id: input.id
        },
        id: Date.now().toString()
    };

    // https://www.bitdefender.com/business/support/en/77209-140259-restorequarantineitem.html
    const config: ProxyConfiguration = {
        endpoint: 'v1.0/jsonrpc/quarantine',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 10
    };

    const response = await nango.post<BitdefenderJsonRpcResponse>(config);

    if (response.data.error) {
        return {
            success: false,
            message: `Error restoring quarantine item: ${response.data.error.message}`,
            raw_json: JSON.stringify(response.data)
        };
    }

    return {
        success: true,
        message: 'Quarantine item successfully restored',
        raw_json: JSON.stringify(response.data)
    };
}
