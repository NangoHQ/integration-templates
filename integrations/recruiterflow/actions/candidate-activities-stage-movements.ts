import type {
    NangoAction,
    ProxyConfiguration,
    RecruiterFlowCandidateActivityStageMovementInput,
    RecruiterFlowCandidateActivityStageMovementOutput,
    RecruiterFlowJobWithTransitions
} from '../../models';
import { recruiterFlowCandidateActivityStageMovementInputSchema } from '../schema.zod';

export default async function runAction(
    nango: NangoAction,
    input: RecruiterFlowCandidateActivityStageMovementInput
): Promise<RecruiterFlowCandidateActivityStageMovementOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateActivityStageMovementInputSchema, input });

    const params: Record<string, string | number> = {
        id: parsedInput.data.id,
        include_count: 'true'
    };
    if (parsedInput.data.after) {
        params['after'] = parsedInput.data.after;
    }
    if (parsedInput.data.before) {
        params['before'] = parsedInput.data.before;
    }

    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activities_stage_movement_list
        endpoint: '/api/external/candidate/activities/stage-movement/list',
        retries: 10,
        params,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'current_page',
            limit_name_in_request: 'items_per_page',
            offset_start_value: 1,
            limit: 100,
            offset_calculation_method: 'per-page',
            response_path: 'data.jobs'
        }
    };
    const response: RecruiterFlowJobWithTransitions[] = [];

    for await (const page of nango.paginate<RecruiterFlowJobWithTransitions>(proxyConfig)) {
        response.push(...page);
    }

    return {
        data: response
    };
}
