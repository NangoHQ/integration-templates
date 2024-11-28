import type { InterviewStageListResponse, NangoAction } from '../../models.js';
import type { PaginationParams } from '../helpers/pagination.js';
import paginate from '../helpers/pagination.js';
import type { InterviewStageList } from '../types.js';

export default async function runAction(nango: NangoAction, input: InterviewStageList): Promise<InterviewStageListResponse[]> {
    return saveAllStages(nango, input.interviewPlanId);
}

async function saveAllStages(nango: NangoAction, interviewPlanId: string) {
    const stages: InterviewStageListResponse[] = [];
    const endpoint = `/interviewStage.list`;
    const nextCursor: string | null = null;
    const params: PaginationParams = {
        endpoint,
        initialCursor: nextCursor,
        data: { interviewPlanId }
    };

    for await (const { results } of paginate<InterviewStageListResponse>(nango, params)) {
        stages.push(results);
    }
    return stages;
}
