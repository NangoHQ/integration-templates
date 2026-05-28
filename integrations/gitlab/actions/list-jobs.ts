import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.union([z.number(), z.string()]).describe('Project ID or URL-encoded namespace path. Example: 82599306'),
    scope: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Job status scope(s) to filter by'),
    order_by: z.string().optional().describe('Order results by a field. Example: "id"'),
    sort: z.string().optional().describe('Sort order. Example: "asc" or "desc"'),
    cursor: z.string().optional().describe('Pagination cursor (page number)'),
    per_page: z.number().optional().describe('Number of results per page. Default: 20')
});

const PipelineSchema = z.object({
    id: z.number(),
    project_id: z.number(),
    ref: z.string(),
    sha: z.string(),
    status: z.string()
});

const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    username: z.string(),
    avatar_url: z.string().optional()
});

const JobSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    stage: z.string(),
    ref: z.string(),
    tag: z.boolean(),
    coverage: z.number().nullable().optional(),
    allow_failure: z.boolean(),
    created_at: z.string().optional(),
    started_at: z.string().nullable().optional(),
    finished_at: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    queued_duration: z.number().nullable().optional(),
    web_url: z.string().optional(),
    failure_reason: z.string().nullable().optional(),
    user: UserSchema.nullable().optional(),
    pipeline: PipelineSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(JobSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List jobs from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-jobs'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_api'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.gitlab.com/api/jobs/
            endpoint: `/api/v4/projects/${encodeURIComponent(String(input.project_id))}/jobs`,
            params: {
                ...(input.scope !== undefined && { scope: input.scope }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.sort !== undefined && { sort: input.sort }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const rawData = z.array(z.unknown()).parse(response.data);
        const items = rawData.map((item) => JobSchema.parse(item));

        const nextPage = response.headers['x-next-page'] || response.headers['X-Next-Page'];
        const next_cursor = typeof nextPage === 'string' && nextPage.length > 0 ? nextPage : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
