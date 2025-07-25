import { createAction } from "nango";
import type { PaginationParams } from '../helpers/pagination.js';
import { paginate } from '../helpers/pagination.js';

import type { InterviewStageListResponse } from "../models.js";
import { StagesResponse, InterviewStageList } from "../models.js";

const action = createAction({
    description: "List all interview stages for an interview plan in order.",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/interviews/stages",
        group: "Interviews"
    },

    input: InterviewStageList,
    output: StagesResponse,
    scopes: ["interviewsRead"],

    exec: async (nango, input): Promise<StagesResponse> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
