import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "prj_fiK50Ju3SQDsgotdoOz0Hj0jHypU"')
});

const ProviderEnvVarSchema = z.object({
    id: z.string(),
    key: z.string(),
    type: z.string(),
    value: z.string().nullish(),
    target: z.array(z.string()).nullish(),
    createdAt: z.number().nullish(),
    updatedAt: z.number().nullish(),
    createdBy: z.string().nullish(),
    updatedBy: z.string().nullish(),
    gitBranch: z.string().nullish(),
    comment: z.string().nullish(),
    customEnvironmentIds: z.array(z.string()).nullish(),
    contentHint: z.record(z.string(), z.unknown()).nullish(),
    edgeConfigId: z.string().nullish(),
    edgeConfigTokenId: z.string().nullish(),
    vsmValue: z.string().nullish(),
    system: z.boolean().nullish()
});

const OutputEnvVarSchema = z.object({
    id: z.string(),
    key: z.string(),
    type: z.string(),
    value: z.string().optional(),
    target: z.array(z.string()).optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
    gitBranch: z.string().optional(),
    comment: z.string().optional(),
    customEnvironmentIds: z.array(z.string()).optional(),
    contentHint: z.record(z.string(), z.unknown()).optional(),
    edgeConfigId: z.string().optional(),
    edgeConfigTokenId: z.string().optional(),
    vsmValue: z.string().optional(),
    system: z.boolean().optional()
});

const OutputSchema = z.object({
    envs: z.array(OutputEnvVarSchema)
});

const action = createAction({
    description: 'List project env vars.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#get-project-environment-variables
            endpoint: `/v10/projects/${encodeURIComponent(input.projectId)}/env`,
            retries: 3
        });

        const raw = z
            .object({
                envs: z.array(ProviderEnvVarSchema).optional()
            })
            .parse(response.data);

        const envs = (raw.envs ?? []).map((item) => ({
            id: item.id,
            key: item.key,
            type: item.type,
            ...(item.value !== undefined && item.value !== null && { value: item.value }),
            ...(item.target !== undefined && item.target !== null && { target: item.target }),
            ...(item.createdAt !== undefined && item.createdAt !== null && { createdAt: item.createdAt }),
            ...(item.updatedAt !== undefined && item.updatedAt !== null && { updatedAt: item.updatedAt }),
            ...(item.createdBy !== undefined && item.createdBy !== null && { createdBy: item.createdBy }),
            ...(item.updatedBy !== undefined && item.updatedBy !== null && { updatedBy: item.updatedBy }),
            ...(item.gitBranch !== undefined && item.gitBranch !== null && { gitBranch: item.gitBranch }),
            ...(item.comment !== undefined && item.comment !== null && { comment: item.comment }),
            ...(item.customEnvironmentIds !== undefined && item.customEnvironmentIds !== null && { customEnvironmentIds: item.customEnvironmentIds }),
            ...(item.contentHint !== undefined && item.contentHint !== null && { contentHint: item.contentHint }),
            ...(item.edgeConfigId !== undefined && item.edgeConfigId !== null && { edgeConfigId: item.edgeConfigId }),
            ...(item.edgeConfigTokenId !== undefined && item.edgeConfigTokenId !== null && { edgeConfigTokenId: item.edgeConfigTokenId }),
            ...(item.vsmValue !== undefined && item.vsmValue !== null && { vsmValue: item.vsmValue }),
            ...(item.system !== undefined && item.system !== null && { system: item.system })
        }));

        return {
            envs
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
