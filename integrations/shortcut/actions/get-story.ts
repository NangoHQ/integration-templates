import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    story_public_id: z.number().int().describe('The public ID of the story. Example: 35')
});

function optionalNumber() {
    return z.number().optional();
}

function optionalString() {
    return z.string().optional();
}

function optionalBoolean() {
    return z.boolean().optional();
}

// Shortcut's API returns null for absent scalar fields; the schema models them as
// optional (undefined) instead, so normalize before parsing.
const NULLABLE_TOP_LEVEL_FIELDS = [
    'name',
    'description',
    'story_type',
    'workflow_state_id',
    'project_id',
    'epic_id',
    'iteration_id',
    'created_at',
    'updated_at'
];

const NULLABLE_ARRAY_FIELDS = ['comments', 'tasks', 'story_links', 'external_links', 'linked_files', 'branches', 'commits', 'pull_requests'];

function stripNullsForFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
    const result = { ...obj };
    for (const field of fields) {
        if (result[field] === null) {
            delete result[field];
        }
    }
    return result;
}

function stripAllNulls(obj: Record<string, unknown>): Record<string, unknown> {
    return stripNullsForFields(obj, Object.keys(obj));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeStory(raw: Record<string, unknown>): Record<string, unknown> {
    const normalized = stripNullsForFields(raw, NULLABLE_TOP_LEVEL_FIELDS);
    for (const field of NULLABLE_ARRAY_FIELDS) {
        const value = normalized[field];
        if (Array.isArray(value)) {
            normalized[field] = value.map((item) => (isRecord(item) ? stripAllNulls(item) : item));
        }
    }
    return normalized;
}

const StoryCommentSchema = z.object({
    id: z.number(),
    text: optionalString(),
    author_id: optionalString(),
    created_at: optionalString(),
    updated_at: optionalString()
});

const StoryTaskSchema = z.object({
    id: z.number(),
    description: optionalString(),
    complete: optionalBoolean(),
    created_at: optionalString(),
    updated_at: optionalString()
});

const StoryLinkSchema = z.object({
    id: z.number(),
    subject_id: z.number(),
    object_id: z.number(),
    verb: optionalString(),
    created_at: optionalString(),
    updated_at: optionalString()
});

const ExternalLinkSchema = z.object({
    id: z.number(),
    name: optionalString(),
    url: optionalString()
});

const LinkedFileSchema = z.object({
    id: z.number(),
    name: optionalString(),
    url: optionalString(),
    type: optionalString()
});

const BranchSchema = z.object({
    id: optionalNumber(),
    name: optionalString()
});

const CommitSchema = z.object({
    id: optionalNumber(),
    message: optionalString()
});

const PullRequestSchema = z.object({
    id: optionalNumber(),
    number: optionalNumber(),
    url: optionalString()
});

const OutputSchema = z
    .object({
        id: z.number(),
        name: optionalString(),
        description: optionalString(),
        story_type: optionalString(),
        workflow_state_id: optionalNumber(),
        project_id: optionalNumber(),
        epic_id: optionalNumber(),
        iteration_id: optionalNumber(),
        created_at: optionalString(),
        updated_at: optionalString(),
        comments: z.array(StoryCommentSchema).optional(),
        tasks: z.array(StoryTaskSchema).optional(),
        story_links: z.array(StoryLinkSchema).optional(),
        external_links: z.array(ExternalLinkSchema).optional(),
        files: z.array(z.object({ id: z.number() }).passthrough()).optional(),
        linked_files: z.array(LinkedFileSchema).optional(),
        branches: z.array(BranchSchema).optional(),
        commits: z.array(CommitSchema).optional(),
        pull_requests: z.array(PullRequestSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single story with its embedded comments, tasks, and links.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.shortcut.com/api/rest/v3#Get-Story
            endpoint: `/api/v3/stories/${encodeURIComponent(String(input.story_public_id))}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Story not found',
                story_public_id: input.story_public_id
            });
        }

        const story = OutputSchema.parse(normalizeStory(response.data));
        return story;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
