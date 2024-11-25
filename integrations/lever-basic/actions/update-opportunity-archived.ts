import type { NangoAction, ProxyConfiguration, ArchiveOpportunity, SuccessResponse } from '../../models.js';
import { buildUrlWithParams } from '../helpers/query.js';

export default async function runAction(nango: NangoAction, input: ArchiveOpportunity): Promise<SuccessResponse> {
    if (!input.opportunityId) {
        throw new nango.ActionError({
            message: 'opportunityId can not be null or undefined'
        });
    }

    interface archiveOpportunity {
        reason: string;
        cleanInterviews?: boolean;
        requisitionId?: string;
    }

    const putData: archiveOpportunity = {
        reason: input.reason,
        cleanInterviews: input?.cleanInterviews ?? false
    };

    if (input.requisitionId) {
        putData.requisitionId = input.requisitionId;
    }

    let path = `/v1/opportunities/${input.opportunityId}/archived`;
    if (input.perform_as) {
        path = buildUrlWithParams(path, { perform_as: input.perform_as });
    }

    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#update-opportunity-archived-state
        endpoint: path,
        data: putData,
        retries: 10
    };

    const resp = await nango.put(config);
    return {
        success: true,
        opportunityId: input.opportunityId,
        response: resp.data.data
    };
}
