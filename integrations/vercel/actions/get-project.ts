import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idOrName: z.string().describe('Project ID (prj_...) or project name. Example: "nango-test-main"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        accountId: z.string(),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
        framework: z.string().nullable().optional(),
        link: z.object({}).passthrough().nullable().optional(),
        nodeVersion: z.string().optional(),
        rootDirectory: z.string().nullable().optional(),
        gitProvider: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        targets: z.object({}).passthrough().optional(),
        latestDeployments: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://vercel.com/docs/rest-api/reference#get-project
        const response = await nango.get({
            endpoint: `/v9/projects/${encodeURIComponent(input.idOrName)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Project not found: ${input.idOrName}`
            });
        }

        const providerProject = OutputSchema.parse(response.data);
        return providerProject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
