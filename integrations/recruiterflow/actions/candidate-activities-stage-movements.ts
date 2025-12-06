import { createAction } from 'nango';
import { recruiterFlowCandidateActivityStageMovementInputSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';

import type { RecruiterFlowJobWithTransitions } from '../models.js';
import { RecruiterFlowCandidateActivityStageMovementOutput, RecruiterFlowCandidateActivityStageMovementInput } from '../models.js';

const action = createAction({
    description: 'Fetches all candidate activities stage movements from RecruiterFlow',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/candidate-activities-stage-movements',
        group: 'Candidates'
    },

    input: RecruiterFlowCandidateActivityStageMovementInput,
    output: RecruiterFlowCandidateActivityStageMovementOutput,

    exec: async (nango, input): Promise<RecruiterFlowCandidateActivityStageMovementOutput> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
