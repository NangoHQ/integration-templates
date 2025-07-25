import { createAction } from "nango";
import { AshbyCreateApplicationResponse, AshbyCreateCandidateInput } from "../models.js";

const action = createAction({
    description: "Action to consider a candidate for a job",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/applications",
        group: "Applications"
    },

    input: AshbyCreateCandidateInput,
    output: AshbyCreateApplicationResponse,

    exec: async (nango, input): Promise<AshbyCreateApplicationResponse> => {
        if (!input.candidateId) {
            throw new nango.ActionError({
                message: 'candidateId is a required field'
            });
        } else if (!input.jobId) {
            throw new nango.ActionError({
                message: 'jobId is a required field'
            });
        }

        const postData = {
            candidateId: input.candidateId,
            jobId: input.jobId,
            interviewPlanId: input.interviewPlanId,
            interviewStageId: input.interviewStageId,
            sourceId: input.sourceId,
            creditedToUserId: input.creditedToUserId
        };

        const resp = await nango.post({
            endpoint: '/application.create',
            data: postData,
            retries: 3
        });

        const {
            id,
            createdAt,
            updatedAt,
            status,
            customFields,
            candidate,
            currentInterviewStage,
            source,
            archiveReason,
            job,
            creditedToUser,
            hiringTeam,
            appliedViaJobPostingId
        } = resp.data.results;

        return {
            id,
            createdAt,
            updatedAt,
            status,
            customFields,
            candidate,
            currentInterviewStage,
            source,
            archiveReason,
            job,
            creditedToUser,
            hiringTeam,
            appliedViaJobPostingId
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
