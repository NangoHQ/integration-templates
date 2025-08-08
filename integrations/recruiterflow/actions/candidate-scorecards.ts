import { createAction } from 'nango';
import { recruiterFlowCandidateScorecardInputSchema } from '../schema.zod.js';

import type { ProxyConfiguration } from 'nango';
import { RecruiterFlowCandidateScorecard, RecruiterFlowCandidateScorecardInput } from '../models.js';

const action = createAction({
    description: 'Fetches all candidate scorecards from RecruiterFlow',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/candidate-scorecards',
        group: 'Candidates'
    },

    input: RecruiterFlowCandidateScorecardInput,
    output: RecruiterFlowCandidateScorecard,

    exec: async (nango, input): Promise<RecruiterFlowCandidateScorecard> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateScorecardInputSchema, input });
        const proxyConfig: ProxyConfiguration = {
            // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_scorecard_list
            // candidate_id is being used instead of id
            endpoint: '/api/external/candidate/scorecard/list',
            retries: 10,
            params: parsedInput.data
        };

        await nango.log(proxyConfig);

        const response = await nango.get<{ data: RecruiterFlowCandidateScorecard }>(proxyConfig);
        const scorecards = response.data.data;

        return scorecards;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
