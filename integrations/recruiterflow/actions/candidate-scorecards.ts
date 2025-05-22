import type { NangoAction, RecruiterFlowCandidateScorecard, ProxyConfiguration, RecruiterFlowCandidateScorecardInput } from '../../models';
import { recruiterFlowCandidateScorecardInputSchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: RecruiterFlowCandidateScorecardInput): Promise<RecruiterFlowCandidateScorecard> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: recruiterFlowCandidateScorecardInputSchema, input });
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_scorecard_list
        // candidate_id is being used instead of id
        endpoint: '/api/external/candidate/scorecard/list',
        retries: 10,
        data: parsedInput.data
    };

    await nango.log(proxyConfig);

    const response = await nango.get<RecruiterFlowCandidateScorecard>(proxyConfig);
    const scorecards = response.data;

    return scorecards;
}
