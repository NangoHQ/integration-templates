import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "prj_xxx" or "my-project"'),
    envId: z.string().describe('Environment variable ID. Example: "BHAxg7VRZkzgnoOI"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        key: z.string(),
        type: z.string(),
        value: z.string().optional(),
        target: z.union([z.string(), z.array(z.string())]).optional(),
        updatedAt: z.number().optional(),
        createdAt: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Delete project env var.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://vercel.com/docs/rest-api/reference#delete-project-environment-variable
            endpoint: `/v10/projects/${encodeURIComponent(input.projectId)}/env/${encodeURIComponent(input.envId)}`,
            data: {},
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Environment variable not found or project does not exist',
                projectId: input.projectId,
                envId: input.envId
            });
        }

        const envVar = OutputSchema.parse(response.data);
        return envVar;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
