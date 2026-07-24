import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The candidate id. Example: "27273038"'),
    member_id: z.string().describe('The member adding or updating the rating. Example: "1f395d"'),
    stage_id: z.string().optional().describe("The stage of the rating. Defaults to the candidate's current stage when omitted."),
    comment: z.string().describe('A comment about the scoring of the candidate.'),
    scale: z.enum(['thumbs', 'stars', 'numbers']).optional().describe('The rating scale. Defaults to thumbs.'),
    grade: z.number().describe('The candidate grade. Range depends on scale: thumbs 0-2, stars 0-4, numbers 0-9.'),
    score: z.string().optional().describe('Deprecated. One of negative, positive or definite. If provided, scale and grade are ignored.'),
    score_card: z.object({}).passthrough().optional().describe('Score card object with sections, traits and questions.')
});

const ProviderRatingSchema = z
    .object({
        id: z.string().optional(),
        member_id: z.string().optional(),
        stage_id: z.string().optional(),
        comment: z.string().optional(),
        scale: z.string().optional(),
        grade: z.number().optional(),
        score: z.string().optional(),
        score_card: z.object({}).passthrough().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string().optional(),
    member_id: z.string().optional(),
    stage_id: z.string().optional(),
    comment: z.string().optional(),
    scale: z.string().optional(),
    grade: z.number().optional(),
    score: z.string().optional(),
    score_card: z.object({}).passthrough().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: "Create or update the acting member's evaluation for a candidate's current (or specified) stage.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://workable.readme.io/reference/update-candidate-rating
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/ratings`,
            data: {
                member_id: input.member_id,
                comment: input.comment,
                grade: input.grade,
                ...(input.stage_id !== undefined && { stage_id: input.stage_id }),
                ...(input.scale !== undefined && { scale: input.scale }),
                ...(input.score !== undefined && { score: input.score }),
                ...(input.score_card !== undefined && { score_card: input.score_card })
            },
            retries: 3
        });

        if (!response.data) {
            return {};
        }

        const providerRating = ProviderRatingSchema.parse(response.data);

        return {
            ...(providerRating.id !== undefined && { id: providerRating.id }),
            ...(providerRating.member_id !== undefined && { member_id: providerRating.member_id }),
            ...(providerRating.stage_id !== undefined && { stage_id: providerRating.stage_id }),
            ...(providerRating.comment !== undefined && { comment: providerRating.comment }),
            ...(providerRating.scale !== undefined && { scale: providerRating.scale }),
            ...(providerRating.grade !== undefined && { grade: providerRating.grade }),
            ...(providerRating.score !== undefined && { score: providerRating.score }),
            ...(providerRating.score_card !== undefined && { score_card: providerRating.score_card }),
            ...(providerRating.created_at !== undefined && { created_at: providerRating.created_at }),
            ...(providerRating.updated_at !== undefined && { updated_at: providerRating.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
