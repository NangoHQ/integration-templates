import { z } from 'zod';
import { createAction } from 'nango';

const VariableSchema = z.object({
    value: z.string(),
    isSecret: z.boolean().optional()
});

const InputSchema = z.object({
    project: z.string().describe('Project ID or project name. Example: "nangoapi"'),
    pipelineId: z.number().describe('The pipeline ID. Example: 1'),
    refName: z.string().optional().describe('The branch ref to run the pipeline on. Example: "refs/heads/main"'),
    variables: z.record(z.string(), VariableSchema).optional(),
    templateParameters: z.record(z.string(), z.unknown()).optional()
});

const PipelineReferenceSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const RunSchema = z.object({
    id: z.number(),
    state: z.string().optional(),
    result: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    pipeline: PipelineReferenceSchema.optional(),
    createdDate: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    state: z.string().optional(),
    result: z.string().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    pipelineId: z.number().optional(),
    pipelineName: z.string().optional(),
    pipelineUrl: z.string().optional(),
    createdDate: z.string().optional()
});

const action = createAction({
    description: 'Trigger a YAML pipeline run.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/run-pipeline',
        group: 'Pipelines'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build_execute'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        type RunPipelineBody = {
            resources?: {
                repositories: {
                    self: {
                        refName: string;
                    };
                };
            };
            variables?: Record<string, { value: string; isSecret?: boolean | undefined }>;
            templateParameters?: Record<string, unknown>;
        };

        const body: RunPipelineBody = {};

        if (input.refName !== undefined) {
            body.resources = {
                repositories: {
                    self: {
                        refName: input.refName
                    }
                }
            };
        }

        if (input.variables !== undefined) {
            body.variables = input.variables;
        }

        if (input.templateParameters !== undefined) {
            body.templateParameters = input.templateParameters;
        }

        const encodedProject = encodeURIComponent(input.project);
        const encodedPipelineId = encodeURIComponent(String(input.pipelineId));

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/run-pipeline?view=azure-devops-rest-7.2
            endpoint: `/${encodedProject}/_apis/pipelines/${encodedPipelineId}/runs`,
            params: {
                'api-version': '7.2-preview.1'
            },
            data: body,
            retries: 3
        });

        const run = RunSchema.parse(response.data);
        const pipeline = run.pipeline ?? {};

        return {
            id: run.id,
            state: run.state,
            result: run.result,
            name: run.name,
            url: run.url,
            pipelineId: pipeline.id,
            pipelineName: pipeline.name,
            pipelineUrl: pipeline.url,
            createdDate: run.createdDate
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
