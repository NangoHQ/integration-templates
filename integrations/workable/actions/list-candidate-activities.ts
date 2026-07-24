import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    candidate_id: z.string().describe('The candidate ID. Example: "27273038"'),
    limit: z.number().optional().describe('Number of activities per page. Default 50, max 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (full URL from paging.next). Omit for the first page.'),
    since_id: z.string().optional().describe('Returns results with an ID greater than or equal to the specified ID.'),
    max_id: z.string().optional().describe('Returns results with an ID less than or equal to the specified ID.'),
    actions: z.string().optional().describe('Comma-delimited list of actions to filter by. Example: "comment,rating"'),
    updated_after: z.string().optional().describe('Returns activities updated equal or later than the provided date. Example: "2024-01-01T00:00:00Z"')
});

const MemberSchema = z.object({
    id: z.string(),
    name: z.string()
});

const StageSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderActivitySchema = z.object({
    id: z.string().optional(),
    action: z.string(),
    stage_name: z.string().nullable().optional(),
    action_stage: StageSchema.nullable().optional(),
    target_stage: StageSchema.nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    member: MemberSchema.nullable().optional(),
    body: z.string().nullable().optional(),
    rating: z.object({}).passthrough().nullable().optional(),
    visibility_roles: z.array(z.string()).nullable().optional()
});

const OutputActivitySchema = z.object({
    id: z.string().optional(),
    action: z.string(),
    stage_name: z.string().optional(),
    action_stage: StageSchema.optional(),
    target_stage: StageSchema.optional(),
    created_at: z.string(),
    updated_at: z.string(),
    member: MemberSchema.optional(),
    body: z.string().optional(),
    rating: z.object({}).passthrough().optional(),
    visibility_roles: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    activities: z.array(OutputActivitySchema),
    next_cursor: z.string().optional()
});

type OutputActivity = z.infer<typeof OutputActivitySchema>;

const action = createAction({
    description: "List a candidate's activity stream (comments, moves, ratings, disqualifications).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = `/spi/v3/candidates/${encodeURIComponent(input.candidate_id)}/activities`;
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            // @allowTryCatch Catching URL parse errors to emit a clean ActionError for invalid cursor input.
            try {
                const cursorUrl = new URL(input.cursor);
                endpoint = cursorUrl.pathname;
                cursorUrl.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
            } catch {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid cursor format. Cursor must be a valid URL.'
                });
            }
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.since_id !== undefined) {
            params['since_id'] = input.since_id;
        }
        if (input.max_id !== undefined) {
            params['max_id'] = input.max_id;
        }
        if (input.actions !== undefined) {
            params['actions'] = input.actions;
        }
        if (input.updated_after !== undefined) {
            params['updated_after'] = input.updated_after;
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/candidate-activities
            endpoint,
            ...(Object.keys(params).length > 0 && { params }),
            retries: 3
        });

        const raw = response.data;

        if (raw === null || typeof raw !== 'object' || !('activities' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Workable API.'
            });
        }

        const providerResponse = z
            .object({
                activities: z.array(z.unknown()),
                paging: z
                    .object({
                        next: z.string().optional()
                    })
                    .optional()
            })
            .parse(raw);

        const activities: OutputActivity[] = providerResponse.activities
            .map((item) => {
                const parsed = ProviderActivitySchema.safeParse(item);
                if (!parsed.success) {
                    return null;
                }
                const data = parsed.data;
                const activity: OutputActivity = {
                    action: data.action,
                    created_at: data.created_at,
                    updated_at: data.updated_at
                };
                if (data.id !== undefined) {
                    activity.id = data.id;
                }
                if (data.stage_name !== undefined && data.stage_name !== null) {
                    activity.stage_name = data.stage_name;
                }
                if (data.action_stage !== undefined && data.action_stage !== null) {
                    activity.action_stage = data.action_stage;
                }
                if (data.target_stage !== undefined && data.target_stage !== null) {
                    activity.target_stage = data.target_stage;
                }
                if (data.member !== undefined && data.member !== null) {
                    activity.member = data.member;
                }
                if (data.body !== undefined && data.body !== null) {
                    activity.body = data.body;
                }
                if (data.rating !== undefined && data.rating !== null) {
                    activity.rating = data.rating;
                }
                if (data.visibility_roles !== undefined && data.visibility_roles !== null) {
                    activity.visibility_roles = data.visibility_roles;
                }
                return activity;
            })
            .filter((item): item is OutputActivity => item !== null);

        return {
            activities,
            ...(providerResponse.paging?.next !== undefined && { next_cursor: providerResponse.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
