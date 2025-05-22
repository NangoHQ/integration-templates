import type {
    NangoAction,
    RecruiterFlowCandidateActivityStageMovement,
    ProxyConfiguration,
    RecruiterFlowCandidateActivityStageMovementInput,
    RecruiterFlowCandidateActivityStageMovementOutput
} from '../../models';
import { recruiterFlowCandidateActivityStageMovementInputSchema } from '../schema.zod';

export default async function runAction(
    nango: NangoAction,
    input: RecruiterFlowCandidateActivityStageMovementInput
): Promise<RecruiterFlowCandidateActivityStageMovementOutput> {
    console.log('input', input);
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateActivityStageMovementInputSchema, input });

    console.log('parsedInput', parsedInput);
    const params: Record<string, string | number> = {
        // candidate_id: 47509,
        id: 47509
    };
    if (parsedInput.data.after) {
        params['after'] = parsedInput.data.after;
    }
    if (parsedInput.data.before) {
        params['before'] = parsedInput.data.before;
    }
    console.log('params', params);

    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_activities_stage_movement_list
        endpoint: '/api/external/candidate/activities/stage-movement/list',
        retries: 10,
        params,
        data: params,
        paginate: {
            type: 'offset',
            response_path: 'data',
            offset_name_in_request: 'current_page',
            offset_calculation_method: 'per-page',
            limit: 100,
            limit_name_in_request: 'items_per_page'
        }
    };
    const res = await nango.get<RecruiterFlowCandidateActivityStageMovement[]>(proxyConfig);
    console.log('response', res.data);

    const response: RecruiterFlowCandidateActivityStageMovement[] = [];
    console.log('response', response);

    for await (const page of nango.paginate<RecruiterFlowCandidateActivityStageMovement>(proxyConfig)) {
        console.log('page', page);
        response.push(...page);
    }

    return {
        data: response
    };
}
