import type {
    NangoAction,
    RecruiterFlowCandidateFullActivity,
    RecruiterFlowCandidateActivityListInput,
    RecruiterFlowCandidateActivityListOutput,
    ProxyConfiguration
} from '../../models';
import { recruiterFlowCandidateActivityListInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: RecruiterFlowCandidateActivityListInput): Promise<RecruiterFlowCandidateActivityListOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateActivityListInputSchema, input });
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_list
        endpoint: '/api/external/candidate/activity/list',
        retries: 10,
        data: parsedInput.data,
        paginate: {
            type: 'offset',
            response_path: 'data',
            offset_name_in_request: 'current-page',
            offset_calculation_method: 'per-page',
            offset_start_value: 1,
            limit_name_in_request: 'items-per-page',
            limit: 100
        }
    };

    const response: RecruiterFlowCandidateFullActivity[] = [];

    // Use nango.paginate to handle pagination
    for await (const page of nango.paginate<RecruiterFlowCandidateFullActivity>(proxyConfig)) {
        const activities = page;
        response.push(...activities);
    }

    return {
        data: response
    };
}
