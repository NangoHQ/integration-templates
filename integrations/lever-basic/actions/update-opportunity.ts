import type { ArchiveObject, LeverOpportunity, NangoAction, ProxyConfiguration, UpdateOpportunity } from '../../models.js';

export default async function runAction(
    nango: NangoAction,
    input: UpdateOpportunity
): Promise<object[] | { success: boolean; opportunityId: string; response: LeverOpportunity }> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId cannot be null or undefined'
        });
    }

    const returnResponse: object[] = [];
    type OperationType = 'links' | 'sources' | 'stage' | 'tags' | 'archive' | 'other';

    const makeRequest = async (operationType: OperationType, method: 'post' | 'put', data: object) => {
        let endpoint = `/v1/opportunities/${input.opportunityId}`;

        switch (operationType) {
            case 'links':
                endpoint += input?.delete ? '/removeLinks' : '/addLinks';
                break;
            case 'sources':
                endpoint += input?.delete ? '/removeSources' : '/addSources';
                break;
            case 'stage':
                endpoint += '/stage';
                break;
            case 'tags':
                endpoint += input?.delete ? '/removeTags' : '/addTags';
                break;
            case 'archive':
                endpoint += '/archived';
                break;
            default:
                throw new nango.ActionError({
                    message: `Unsupported operation type: ${operationType}`
                });
        }

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#update-opportunity-archived-state
            // https://hire.lever.co/developer/documentation#update-contact-links-by-opportunity
            // https://hire.lever.co/developer/documentation#update-contact-links-by-opportunity
            // https://hire.lever.co/developer/documentation#update-opportunity-sources
            // https://hire.lever.co/developer/documentation#update-opportunity-tags
            endpoint,
            data,
            retries: 10
        };

        if (input.perform_as) {
            config.params = { perform_as: input.perform_as };
        }

        const resp = await nango[method](config);
        return { [operationType]: resp.data.data };
    };

    const addRequest = async (operationType: OperationType, method: 'post' | 'put', data: Partial<UpdateOpportunity> | undefined) => {
        if (data) {
            try {
                const response = await makeRequest(operationType, method, data);
                returnResponse.push(response);
            } catch (error: any) {
                throw new nango.ActionError({
                    message: `operation ${operationType} was not successful because of error, ${error.message}`
                });
            }
        }
    };

    await addRequest('links', 'post', input?.links ? { links: input.links } : undefined);
    await addRequest('sources', 'post', input?.sources ? { sources: input.sources } : undefined);
    await addRequest('stage', 'put', input?.stage ? { stage: input.stage } : undefined);
    await addRequest('tags', 'post', input?.tags ? { tags: input.tags } : undefined);

    if (input.reason) {
        const archiveData: ArchiveObject = {
            reason: input.reason,
            cleanInterviews: input?.cleanInterviews ?? false
        };
        if (input.requisitionId) {
            archiveData.requisitionId = input.requisitionId;
        }
        const archiveResponse = await makeRequest('archive', 'put', archiveData);
        return {
            success: true,
            opportunityId: input.opportunityId,
            response: archiveResponse as LeverOpportunity
        };
    }

    return returnResponse;
}
