import type { NangoAction, WorkableCreateCommentResponse } from '../models';

interface WorkableCreateCommentInput {
    id: string;
    member_id: string;
    comment: {
        body: string;
        policy?: string[];
        attachment?: {
            name: string;
            data: string;
        };
    };
}

export default async function runAction(nango: NangoAction, input: WorkableCreateCommentInput): Promise<WorkableCreateCommentResponse> {
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

    try {
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
            retries: 10
        });

        return {
            id: resp.data.id
        };
    } catch (error: any) {
        throw new Error(`Error in runAction: ${error.message}`);
    }
}
