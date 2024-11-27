import type { InterviewStageListResponse, NangoSync } from '../../models.js';
import type { PaginationParams } from '../helpers/pagination.js';
import paginate from '../helpers/pagination.js';
import type { InterviewStageList } from '../types.js';

export default async function fetchData(nango: NangoSync, input: InterviewStageList): Promise<boolean> {
    await saveAllStages(nango, input.interviewPlanId);
    return true;
}

async function saveAllStages(nango: NangoSync, interviewPlanId: string) {
    const endpoint = `/interviewStage.list`;
    const nextCursor: string | null = null;
    const params: PaginationParams = {
        endpoint,
        initialCursor: nextCursor,
        data: { interviewPlanId }
    };

    for await (const { results } of paginate<InterviewStageListResponse>(nango, params)) {
        await nango.batchSave<InterviewStageListResponse>(results, 'InterviewStageListResponse');
    }
}
