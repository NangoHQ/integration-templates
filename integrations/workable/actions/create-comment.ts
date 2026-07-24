import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    candidate_id: z.string().describe('Candidate ID. Example: "27273038"'),
    member_id: z.string().describe('Member ID. Example: "1f395d"'),
    body: z.string().describe('The comment text'),
    policy: z.array(z.string()).optional().describe('Role visibility list. Example: ["recruiter","admin"]'),
    attachment: z
        .object({
            name: z.string(),
            data: z.string().describe('Base64-encoded file data')
        })
        .optional()
        .describe('Attachment object. Only one attachment per comment.')
});

const ProviderCommentResponseSchema = z
    .object({
        id: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: "Create a comment on the applicant's timeline.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            member_id: input.member_id,
            comment: {
                body: input.body,
                ...(input.policy !== undefined && { policy: input.policy }),
                ...(input.attachment !== undefined && { attachment: input.attachment })
            }
        };

        const response = await nango.post({
            // https://workable.readme.io/reference/comment-on-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.candidate_id)}/comments`,
            data,
            retries: 1
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Workable API when creating comment.'
            });
        }

        const providerComment = ProviderCommentResponseSchema.parse(response.data);

        return {
            ...(providerComment.id !== undefined && { id: providerComment.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
