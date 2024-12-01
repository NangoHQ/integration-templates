import type { InterviewStageList, InterviewStageListResponse, NangoAction, StagesResponse } from '../../models.js';
import type { PaginationParams } from '../helpers/pagination.js';
import paginate from '../helpers/pagination.js';

export default async function runAction(nango: NangoAction, input: InterviewStageList): Promise<StagesResponse> {
    if (!input.interviewPlanId) {
        throw new nango.ActionError({
            message: 'interviewPlanId is a required field'
        });
    }

    const interviewPlanId = input.interviewPlanId;
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
