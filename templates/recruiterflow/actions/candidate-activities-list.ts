import { createAction } from "nango";
import { recruiterFlowCandidateActivityListInputSchema } from '../schema.zod.js';
import type { RecruiterFlowCandidateFullActivityResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";

import {
    RecruiterFlowCandidateFullActivity,
    RecruiterFlowCandidateActivityListOutput,
    RecruiterFlowCandidateActivityListInput,
} from "../models.js";

const action = createAction({
    description: "Fetches all candidate activities list from RecruiterFlow",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/candidate-activities-list",
        group: "Candidates"
    },

    input: RecruiterFlowCandidateActivityListInput,
    output: RecruiterFlowCandidateActivityListOutput,

    exec: async (nango, input): Promise<RecruiterFlowCandidateActivityListOutput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

const toCandidateActivity = (activity: RecruiterFlowCandidateFullActivityResponse): RecruiterFlowCandidateFullActivity => {
    return {
        ...activity
    };
};
