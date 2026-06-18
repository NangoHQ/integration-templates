import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspace: z.string().describe('Workspace slug. Example: "nangodev"'),
    repo_slug: z.string().describe('Repository slug. Example: "nango-api-test"'),
    page: z.number().optional().describe('Page number for pagination. Omit for the first page.'),
    pagelen: z.number().optional().describe('Number of items per page. Example: 10'),
    sort: z.string().optional().describe('Sort field. Example: "-created_on"')
});

const PipelineStateSchema = z
    .object({
        name: z.string().optional(),
        type: z.string().optional(),
        stage: z
            .object({
                name: z.string().optional(),
                type: z.string().optional()
            })
            .optional(),
        result: z
            .object({
                name: z.string().optional(),
                type: z.string().optional()
            })
            .optional()
    })
    .optional();

const PipelineTriggerSchema = z
    .object({
        name: z.string().optional(),
        type: z.string().optional()
    })
    .optional();

const PipelineTargetSchema = z
    .object({
        type: z.string().optional(),
        ref_type: z.string().optional(),
        ref_name: z.string().optional()
    })
    .optional();

const ProviderPipelineSchema = z.object({
    uuid: z.string(),
    build_number: z.number(),
    type: z.string().optional(),
    state: PipelineStateSchema,
    target: PipelineTargetSchema,
    trigger: PipelineTriggerSchema,
    created_on: z.string().optional(),
    completed_on: z.string().optional(),
    build_seconds_used: z.number().optional()
});

const OutputSchema = z.object({
    uuid: z.string(),
    build_number: z.number(),
    type: z.string().optional(),
    state: PipelineStateSchema,
    target: PipelineTargetSchema,
    trigger: PipelineTriggerSchema,
    created_on: z.string().optional(),
    completed_on: z.string().optional(),
    build_seconds_used: z.number().optional()
});

const ListOutputSchema = z.object({
    items: z.array(OutputSchema),
    next_page: z.number().optional()
});

const action = createAction({
    description: 'List pipelines for a repository',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['pipeline'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const response = await nango.get({
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pipelines/#api-repositories-workspace-repo-slug-pipelines-get
            endpoint: `/2.0/repositories/${encodeURIComponent(input.workspace)}/${encodeURIComponent(input.repo_slug)}/pipelines`,
            params: {
                ...(input.page !== undefined && { page: String(input.page) }),
                ...(input.pagelen !== undefined && { pagelen: String(input.pagelen) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const paginatedResponse = z
            .object({
                values: z.array(z.record(z.string(), z.unknown())),
                page: z.number().optional(),
                next: z.string().optional()
            })
            .parse(response.data);

        const items = paginatedResponse.values.map((item) => {
            const pipeline = ProviderPipelineSchema.parse(item);
            return {
                uuid: pipeline.uuid,
                build_number: pipeline.build_number,
                ...(pipeline.type !== undefined && { type: pipeline.type }),
                ...(pipeline.state !== undefined && { state: pipeline.state }),
                ...(pipeline.target !== undefined && { target: pipeline.target }),
                ...(pipeline.trigger !== undefined && { trigger: pipeline.trigger }),
                ...(pipeline.created_on !== undefined && { created_on: pipeline.created_on }),
                ...(pipeline.completed_on !== undefined && { completed_on: pipeline.completed_on }),
                ...(pipeline.build_seconds_used !== undefined && { build_seconds_used: pipeline.build_seconds_used })
            };
        });

        let next_page: number | undefined;
        if (paginatedResponse.next) {
            const nextUrl = new URL(paginatedResponse.next);
            const nextPageStr = nextUrl.searchParams.get('page');
            if (nextPageStr) {
                next_page = parseInt(nextPageStr, 10);
            } else if (paginatedResponse.page != null) {
                next_page = paginatedResponse.page + 1;
            }
        }

        return {
            items,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
