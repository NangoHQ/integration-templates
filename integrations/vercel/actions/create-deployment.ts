import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the deployment. Example: "nango-test-main"'),
    project: z.string().describe('The target project identifier. Example: "prj_..."'),
    target: z.literal('production').optional().describe('Set to "production" for a production deployment. Omit for preview.'),
    files: z
        .array(
            z.object({
                file: z.string().describe('File path. Example: "index.html"'),
                data: z.string().describe('Base64-encoded file content.')
            })
        )
        .describe('Inline files for buildless static deployment.'),
    projectSettings: z
        .object({
            framework: z.null().optional().describe('Set to null for a buildless static deployment.')
        })
        .optional()
        .describe('Project settings. Defaults to { framework: null } for buildless static deployment.')
});

const ProviderDeploymentSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    projectId: z.string(),
    readyState: z.enum(['QUEUED', 'INITIALIZING', 'BUILDING', 'READY', 'ERROR', 'CANCELED', 'BLOCKED']),
    target: z.enum(['production', 'staging']).nullable().optional(),
    createdAt: z.number(),
    status: z.enum(['QUEUED', 'INITIALIZING', 'BUILDING', 'READY', 'ERROR', 'CANCELED', 'BLOCKED']).optional(),
    errorMessage: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    projectId: z.string(),
    readyState: z.string(),
    target: z.string().nullable().optional(),
    createdAt: z.number(),
    status: z.string().optional(),
    errorMessage: z.string().optional()
});

const action = createAction({
    description: 'Create a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            name: input.name,
            project: input.project,
            files: input.files,
            projectSettings: input.projectSettings ?? { framework: null },
            ...(input.target === 'production' && { target: 'production' })
        };

        // https://vercel.com/docs/rest-api/deployments/create-a-new-deployment
        const response = await nango.post({
            endpoint: '/v13/deployments',
            data: body,
            retries: 10
        });

        const deployment = ProviderDeploymentSchema.parse(response.data);

        return {
            id: deployment.id,
            url: deployment.url,
            name: deployment.name,
            projectId: deployment.projectId,
            readyState: deployment.readyState,
            ...(deployment.target !== undefined && { target: deployment.target }),
            createdAt: deployment.createdAt,
            ...(deployment.status !== undefined && { status: deployment.status }),
            ...(deployment.errorMessage != null && { errorMessage: deployment.errorMessage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
