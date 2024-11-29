import type { InterviewStageListResponse, NangoAction, stages } from '../../models.js';
import type { PaginationParams } from '../helpers/pagination.js';
import paginate from '../helpers/pagination.js';
import type { InterviewStageList } from '../types.js';

export default async function runAction(nango: NangoAction, input: InterviewStageList): Promise<stages> {
    return saveAllStages(nango, input.interviewPlanId);
}

async function saveAllStages(nango: NangoAction, interviewPlanId: string) {
    const stageArr: InterviewStageListResponse[] = [];
    const endpoint = `/interviewStage.list`;
    const nextCursor: string | null = null;
    const params: PaginationParams = {
        endpoint,
        initialCursor: nextCursor,
        data: { interviewPlanId }
    };

    for await (const { results } of paginate<InterviewStageListResponse>(nango, params)) {
        for (const result of results) {
            stageArr.push(result);
        }
    }
    return { stages: stageArr };
}
