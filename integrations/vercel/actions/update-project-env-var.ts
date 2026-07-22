import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The unique project identifier or the project name. Example: "prj_fiK50Ju3SQDsgotdoOz0Hj0jHypU"'),
    envId: z.string().describe('The unique environment variable identifier. Example: "BHAxg7VRZkzgnoOI"'),
    value: z.string().optional().describe('The new value of the environment variable.'),
    target: z
        .array(z.enum(['production', 'preview', 'development']))
        .optional()
        .describe('The target environment(s) of the environment variable.'),
    key: z.string().optional().describe('The name of the environment variable.'),
    type: z.enum(['system', 'encrypted', 'plain', 'secret', 'sensitive']).optional().describe('The type of environment variable.'),
    gitBranch: z.string().nullable().optional().describe('If defined, the git branch of the environment variable (must have target=preview).'),
    comment: z.string().optional().describe('A comment to add context on what this env var is for.'),
    customEnvironmentIds: z.array(z.string()).optional().describe('The custom environments that the environment variable should be synced to.')
});

const ProviderEnvVarSchema = z.object({
    type: z.string(),
    value: z.string(),
    key: z.string(),
    target: z.array(z.string()),
    id: z.string(),
    configurationId: z.string().optional().nullable(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    gitBranch: z.string().nullable().optional(),
    comment: z.string().optional(),
    customEnvironmentIds: z.array(z.string()).optional(),
    system: z.boolean().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    key: z.string(),
    value: z.string(),
    type: z.string(),
    target: z.array(z.string()),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional(),
    gitBranch: z.string().nullable().optional(),
    comment: z.string().optional(),
    customEnvironmentIds: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Update project env var.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};
        if (input.value !== undefined) {
            data['value'] = input.value;
        }
        if (input.target !== undefined) {
            data['target'] = input.target;
        }
        if (input.key !== undefined) {
            data['key'] = input.key;
        }
        if (input.type !== undefined) {
            data['type'] = input.type;
        }
        if (input.gitBranch !== undefined) {
            data['gitBranch'] = input.gitBranch;
        }
        if (input.comment !== undefined) {
            data['comment'] = input.comment;
        }
        if (input.customEnvironmentIds !== undefined) {
            data['customEnvironmentIds'] = input.customEnvironmentIds;
        }

        // https://vercel.com/docs/rest-api/projects/edit-an-environment-variable
        const response = await nango.patch({
            endpoint: `/v9/projects/${encodeURIComponent(input.projectId)}/env/${encodeURIComponent(input.envId)}`,
            data,
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Environment variable not found or update failed.',
                projectId: input.projectId,
                envId: input.envId
            });
        }

        const providerEnvVar = ProviderEnvVarSchema.parse(response.data);

        return {
            id: providerEnvVar.id,
            key: providerEnvVar.key,
            value: providerEnvVar.value,
            type: providerEnvVar.type,
            target: providerEnvVar.target,
            ...(providerEnvVar.updatedAt !== undefined && { updatedAt: providerEnvVar.updatedAt }),
            ...(providerEnvVar.createdAt !== undefined && { createdAt: providerEnvVar.createdAt }),
            ...(providerEnvVar.gitBranch !== undefined && { gitBranch: providerEnvVar.gitBranch }),
            ...(providerEnvVar.comment !== undefined && { comment: providerEnvVar.comment }),
            ...(providerEnvVar.customEnvironmentIds !== undefined && { customEnvironmentIds: providerEnvVar.customEnvironmentIds })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
