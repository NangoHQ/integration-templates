import type { ArchiveObject, LeverOpportunity, NangoAction, ProxyConfiguration, UpdateOpportunity } from '../../models.js';
import type { OperationConfig, OperationType } from '../types.js';

export default async function runAction(nango: NangoAction, input: UpdateOpportunity): Promise<{ data: Partial<LeverOpportunity> }> {
    if (!input.opportunityId) {
        throw new Error('opportunityId cannot be null or undefined');
    }

    const combinedResponse: Partial<LeverOpportunity> = {};

    const operations: OperationConfig[] = buildOperations(input);

    for (const operation of operations) {
        await processOperation(nango, input.opportunityId, operation, combinedResponse);
    }

    // handle archive data
    if (input.reason) {
        const archiveData: ArchiveObject = {
            reason: input.reason,
            cleanInterviews: input.cleanInterviews ?? false
        };

        if (input.requisitionId) {
            archiveData.requisitionId = input.requisitionId;
        }

        const response = await makeRequest(nango, 'archive', 'put', input.opportunityId, archiveData);
        Object.assign(combinedResponse, response);
    }

    return { data: combinedResponse };
}

function buildOperations(input: UpdateOpportunity): OperationConfig[] {
    const operations: OperationConfig[] = [];

    if (input.links) {
        operations.push({
            type: 'links',
            method: 'post',
            data: { links: input.links },
            isDelete: input.delete
        });
    }

    if (input.sources) {
        operations.push({
            type: 'sources',
            method: 'post',
            data: { sources: input.sources },
            isDelete: input.delete
        });
    }

    if (input.stage) {
        operations.push({
            type: 'stage',
            method: 'put',
            data: { stage: input.stage }
        });
    }

    if (input.tags) {
        operations.push({
            type: 'tags',
            method: 'post',
            data: { tags: input.tags },
            isDelete: input.delete
        });
    }

    return operations;
}

async function processOperation(
    nango: NangoAction,
    opportunityId: string,
    operation: OperationConfig,
    combinedResponse: Partial<LeverOpportunity>
): Promise<void> {
    const response = await makeRequest(nango, operation.type, operation.method, opportunityId, operation.data, operation.isDelete);
    Object.assign(combinedResponse, response);
}

async function makeRequest(
    nango: NangoAction,
    operationType: OperationType,
    method: 'post' | 'put',
    opportunityId: string,
    data: object,
    isDelete?: boolean
): Promise<LeverOpportunity> {
    const endpoint = buildEndpoint(operationType, opportunityId, isDelete);
    const config = createProxyConfiguration(endpoint, data);

    const resp = await nango[method](config);
    return resp.data.data;
}

function buildEndpoint(operationType: OperationType, opportunityId: string, isDelete?: boolean): string {
    let endpoint = `/v1/opportunities/${opportunityId}`;

    switch (operationType) {
        case 'links':
            endpoint += isDelete ? '/removeLinks' : '/addLinks';
            break;
        case 'sources':
            endpoint += isDelete ? '/removeSources' : '/addSources';
            break;
        case 'stage':
            endpoint += '/stage';
            break;
        case 'tags':
            endpoint += isDelete ? '/removeTags' : '/addTags';
            break;
        case 'archive':
            endpoint += '/archived';
            break;
        default:
            throw new Error(`Unsupported operation type: ${operationType}`);
    }

    return endpoint;
}

function createProxyConfiguration(endpoint: string, data: object): ProxyConfiguration {
    return {
        endpoint,
        data,
        retries: 3
    };
}
