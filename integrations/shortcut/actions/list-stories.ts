import { z } from 'zod';
import { createAction } from 'nango';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const storyTypeLiteral = z.union([z.literal('feature'), z.literal('chore'), z.literal('bug')]);
const workflowStateTypeLiteral = z.union([z.literal('started'), z.literal('backlog'), z.literal('unstarted'), z.literal('done')]);

const InputSchema = z.object({
    query: z
        .string()
        .optional()
        .describe('Simple text query for GET /search/stories using Shortcut search-operator syntax. When provided, the structured filters below are ignored.'),
    archived: z.boolean().optional().describe('Filter by archived state.'),
    workflow_state_types: z.array(workflowStateTypeLiteral).optional().describe('Filter by workflow state types.'),
    owner_ids: z.array(z.string().uuid()).optional().describe('Filter by owner UUIDs.'),
    group_id: z.string().uuid().optional().describe('Filter by group (team) UUID.'),
    epic_id: z.number().optional().describe('Filter by epic ID.'),
    epic_ids: z.array(z.number()).optional().describe('Filter by multiple epic IDs.'),
    iteration_id: z.number().optional().describe('Filter by iteration ID.'),
    iteration_ids: z.array(z.number()).optional().describe('Filter by multiple iteration IDs.'),
    label_ids: z.array(z.number()).optional().describe('Filter by label IDs.'),
    story_type: storyTypeLiteral.optional().describe('Filter by a single story type.'),
    updated_at_start: z.string().optional().describe('Stories updated on or after this ISO 8601 date.'),
    updated_at_end: z.string().optional().describe('Stories updated on or before this ISO 8601 date.'),
    created_at_start: z.string().optional().describe('Stories created on or after this ISO 8601 date.'),
    created_at_end: z.string().optional().describe('Stories created on or before this ISO 8601 date.'),
    includes_description: z.boolean().optional().describe('Include story description in the response.'),
    page_size: z.number().optional().describe('Number of results per page. Only used with `query` (GET /search/stories); ignored otherwise.'),
    cursor: z
        .string()
        .optional()
        .describe(
            'Pagination cursor from the previous response (`next` field). Only used with `query` (GET /search/stories) — the structured-filter search (POST /stories/search) returns the full result set with no pagination support and ignores this field.'
        )
});

const StorySchema = z
    .object({
        id: z.number(),
        name: z.string(),
        story_type: z.string().optional(),
        app_url: z.string().optional(),
        archived: z.boolean().optional(),
        blocked: z.boolean().optional(),
        blocker: z.boolean().optional(),
        completed: z.boolean().optional(),
        completed_at: z.string().nullable().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        deadline: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        entity_type: z.string().optional(),
        epic_id: z.number().nullable().optional(),
        estimate: z.number().nullable().optional(),
        external_id: z.string().nullable().optional(),
        follower_ids: z.array(z.string()).optional(),
        group_id: z.string().nullable().optional(),
        iteration_id: z.number().nullable().optional(),
        label_ids: z.array(z.number()).optional(),
        owner_ids: z.array(z.string()).optional(),
        position: z.number().optional(),
        project_id: z.number().nullable().optional(),
        requested_by_id: z.string().optional(),
        started: z.boolean().optional(),
        workflow_id: z.number().optional(),
        workflow_state_id: z.number().optional(),
        parent_story_id: z.number().nullable().optional(),
        stats: z.record(z.string(), z.unknown()).optional(),
        tasks: z.array(z.object({}).passthrough()).optional(),
        comments: z.array(z.object({}).passthrough()).optional(),
        story_links: z.array(z.object({}).passthrough()).optional(),
        custom_fields: z.array(z.object({}).passthrough()).optional(),
        labels: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    stories: z.array(StorySchema),
    next: z.string().optional(),
    total: z.number().optional()
});

const action = createAction({
    description: 'Search/list stories with rich filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;

        if (input.query) {
            const params: Record<string, string | number> = {
                query: input.query,
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor && { next: input.cursor })
            };

            response = await nango.get({
                // https://developer.shortcut.com/api/rest/v3#Search-Stories
                endpoint: '/api/v3/search/stories',
                params,
                retries: 3
            });
        } else {
            const body: Record<string, unknown> = {
                ...(input.archived !== undefined && { archived: input.archived }),
                ...(input.workflow_state_types !== undefined && { workflow_state_types: input.workflow_state_types }),
                ...(input.owner_ids !== undefined && { owner_ids: input.owner_ids }),
                ...(input.group_id !== undefined && { group_id: input.group_id }),
                ...(input.epic_id !== undefined && { epic_id: input.epic_id }),
                ...(input.epic_ids !== undefined && { epic_ids: input.epic_ids }),
                ...(input.iteration_id !== undefined && { iteration_id: input.iteration_id }),
                ...(input.iteration_ids !== undefined && { iteration_ids: input.iteration_ids }),
                ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
                ...(input.story_type !== undefined && { story_type: input.story_type }),
                ...(input.updated_at_start !== undefined && { updated_at_start: input.updated_at_start }),
                ...(input.updated_at_end !== undefined && { updated_at_end: input.updated_at_end }),
                ...(input.created_at_start !== undefined && { created_at_start: input.created_at_start }),
                ...(input.created_at_end !== undefined && { created_at_end: input.created_at_end }),
                ...(input.includes_description !== undefined && { includes_description: input.includes_description })
            };

            response = await nango.post({
                // https://developer.shortcut.com/api/rest/v3#Query-Stories
                endpoint: '/api/v3/stories/search',
                data: body,
                retries: 3
            });
        }

        let rawStories: unknown[] = [];
        let nextCursor: string | null = null;
        let totalCount: number | undefined;

        if (Array.isArray(response.data)) {
            rawStories = response.data;
        } else if (isPlainObject(response.data)) {
            const envelope = response.data;
            if (Array.isArray(envelope['data'])) {
                rawStories = envelope['data'];
                if (typeof envelope['next'] === 'string') {
                    nextCursor = envelope['next'];
                }
                if (typeof envelope['total'] === 'number') {
                    totalCount = envelope['total'];
                }
            } else if (Array.isArray(envelope['stories'])) {
                rawStories = envelope['stories'];
                if (typeof envelope['next'] === 'string') {
                    nextCursor = envelope['next'];
                }
                if (typeof envelope['total'] === 'number') {
                    totalCount = envelope['total'];
                }
            } else {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Unexpected response format from Shortcut API.',
                    details: 'Response object did not contain a recognizable stories array.'
                });
            }
        } else {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Unexpected response format from Shortcut API.',
                details: 'Expected an array or object response.'
            });
        }

        const stories = rawStories.map((item) => {
            const storyResult = StorySchema.safeParse(item);
            if (!storyResult.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse a story from the Shortcut API response.',
                    details: storyResult.error.message
                });
            }
            return storyResult.data;
        });

        return {
            stories,
            ...(nextCursor != null && { next: nextCursor }),
            ...(totalCount !== undefined && { total: totalCount })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
