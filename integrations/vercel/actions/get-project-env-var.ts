import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The unique project identifier or the project name. Example: "nango-test-main"'),
    envId: z.string().describe('The unique ID for the environment variable. Example: "BHAxg7VRZkzgnoOI"')
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    type: z.string(),
    value: z.string().optional(),
    target: z.union([z.string(), z.array(z.string())]).optional(),
    decrypted: z.boolean().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    createdBy: z.string().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
    gitBranch: z.string().optional(),
    comment: z.string().optional(),
    customEnvironmentIds: z.array(z.string()).optional(),
    edgeConfigId: z.string().nullable().optional(),
    edgeConfigTokenId: z.string().nullable().optional(),
    configurationId: z.string().nullable().optional(),
    sunsetSecretId: z.string().optional(),
    legacyValue: z.string().optional(),
    contentHint: z.unknown().nullable().optional(),
    internalContentHint: z.unknown().nullable().optional()
});

const action = createAction({
    description: 'Retrieve a single project environment variable, decrypted.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/projects/retrieve-the-decrypted-value-of-an-environment-variable-of-a-project-by-id
            endpoint: `/v1/projects/${encodeURIComponent(input.projectId)}/env/${encodeURIComponent(input.envId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Environment variable not found',
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
