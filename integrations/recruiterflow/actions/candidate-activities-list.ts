import type {
    NangoAction,
    RecruiterFlowCandidateFullActivity,
    RecruiterFlowCandidateActivityListInput,
    RecruiterFlowCandidateActivityListOutput,
    ProxyConfiguration
} from '../../models';
import { recruiterFlowCandidateActivityListInputSchema } from '../schema.zod.js';
import type { RecruiterFlowCandidateFullActivityResponse } from '../types.js';

export default async function runAction(nango: NangoAction, input: RecruiterFlowCandidateActivityListInput): Promise<RecruiterFlowCandidateActivityListOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateActivityListInputSchema, input });
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activity_list
        endpoint: '/api/external/candidate/activity/list',
        retries: 10,
        params: parsedInput.data,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'current_page',
            limit_name_in_request: 'items_per_page',
            offset_start_value: 1,
            limit: '100',
            offset_calculation_method: 'per-page',
            response_path: 'data'
        }
    };

    const response: RecruiterFlowCandidateFullActivity[] = [];

    for await (const page of nango.paginate<RecruiterFlowCandidateFullActivityResponse>(proxyConfig)) {
        const activities = page.map(toCandidateActivity);
        response.push(...activities);
    }

    return {
        data: response
    };
}

const toCandidateActivity = (activity: RecruiterFlowCandidateFullActivityResponse): RecruiterFlowCandidateFullActivity => {
    return {
        ...activity
    };
};
