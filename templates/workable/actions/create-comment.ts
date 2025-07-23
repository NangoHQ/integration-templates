import { createAction } from "nango";
import { WorkableCreateCommentResponse, WorkableCreateCommentInput } from "../models.js";

const action = createAction({
    description: "Action to create a comment on the applicant's timeline",
    version: "0.0.1",

    endpoint: {
        method: "POST",
        path: "/workable/create-comment"
    },

    input: WorkableCreateCommentInput,
    output: WorkableCreateCommentResponse,
    scopes: ["w_candidates or w_comments"],

    exec: async (nango, input): Promise<WorkableCreateCommentResponse> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'candidate id is a required field'
            });
        } else if (!input.member_id) {
            throw new nango.ActionError({
                message: 'member_id is a required field'
            });
        } else if (!input.comment) {
            throw new nango.ActionError({
                message: 'comment is a required field'
            });
        } else if (!input.comment.body) {
            throw new nango.ActionError({
                message: 'body is a required field for comment'
            });
        }

        const endpoint = `/spi/v3/candidates/${input.id}/comments`;

        const postData = {
            member_id: input.member_id,
            comment: {
                body: input.comment.body,
                policy: input.comment.policy,
                attachment: input.comment.attachment
            }
        };

        const resp = await nango.post({
            endpoint: endpoint,
            data: postData,
            retries: 3
        });

        return {
            id: resp.data.id
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
