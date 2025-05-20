import type { NangoSync, RecruiterFlowCandidateScorecard } from '../../models';
import type { RecruiterFlowCandidateScorecardResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig = {
        endpoint: '/api/external/candidate/scorecard/list',
        retries: 10
    };

    const response = await nango.get(proxyConfig);
    const scorecards = response.data as RecruiterFlowCandidateScorecardResponse[];

    await nango.batchSave(scorecards.map(toCandidateScorecard), 'RecruiterFlowCandidateScorecard');
}

function toCandidateScorecard(record: RecruiterFlowCandidateScorecardResponse): RecruiterFlowCandidateScorecard {
    return {
        id: record.id,
        candidate_id: record.candidate_id,
        job_id: record.job_id,
        created_at: record.created_at,
        created_by: record.created_by,
        scores: record.scores,
        feedback: record.feedback
    };
} 