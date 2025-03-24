import type { NangoAction, ProxyConfiguration, QuarantineItemIdInput, RestoreQuarantineItemOutput } from '../../models';
import type { BitdefenderJsonRpcResponse } from '../types';

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

    // Endpoint documentation: https://www.bitdefender.com/business/support/en/77209-140259-restorequarantineitem.html
    const config: ProxyConfiguration = {
        endpoint: 'v1.0/jsonrpc/quarantine',
        method: 'POST',
        data: requestBody,
        headers: {
            'Content-Type': 'application/json'
        },
        retries: 3 // Default for actions is 3 retries
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
