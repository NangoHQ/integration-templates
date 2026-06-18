import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "MyProject"'),
    pipelineId: z.union([z.string(), z.number()]).describe('Pipeline ID. Example: "123"'),
    top: z.number().optional().describe('Maximum number of runs to return.'),
    continuationToken: z.string().optional().describe('Pagination token from the previous response. Omit for the first page.')
});

const PipelineReferenceSchema = z.object({
    folder: z.string().optional(),
    id: z.number().optional(),
    name: z.string().optional(),
    revision: z.number().optional(),
    url: z.string().optional()
});

const RunSchema = z
    .object({
        id: z.number().optional(),
        name: z.string().optional(),
        state: z.string().optional(),
        result: z.string().optional(),
        createdDate: z.string().optional(),
        finishedDate: z.string().optional(),
        url: z.string().optional(),
        pipeline: PipelineReferenceSchema.optional(),
        tags: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    runs: z.array(RunSchema),
    continuationToken: z.string().optional()
});

const action = createAction({
    description: 'List runs for a specific YAML pipeline.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-pipeline-runs',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/pipelines/${encodeURIComponent(String(input.pipelineId))}/runs`,
            params: {
                'api-version': '7.2-preview.1',
                ...(input.continuationToken !== undefined && { continuationToken: input.continuationToken }),
                ...(input.top !== undefined && { $top: String(input.top) })
            },
            retries: 3
        });

        const responseData = response.data;
        let runs: unknown[] = [];
        if (Array.isArray(responseData)) {
            runs = responseData;
        } else if (responseData !== null && typeof responseData === 'object' && 'value' in responseData && Array.isArray(responseData.value)) {
            runs = responseData.value;
        } else {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Azure DevOps pipeline runs API.'
            });
        }

        const validatedRuns = runs.map((item) => {
            const parseResult = RunSchema.safeParse(item);
            if (!parseResult.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid run item in response.',
                    details: parseResult.error.issues
                });
            }
            return parseResult.data;
        });

        const continuationToken = response.headers['x-ms-continuationtoken'];

        return {
            runs: validatedRuns,
            ...(continuationToken !== undefined && typeof continuationToken === 'string' && { continuationToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
