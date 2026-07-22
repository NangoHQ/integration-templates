import { z } from 'zod';
import { createAction } from 'nango';

const EnvVarInputSchema = z.object({
    key: z.string().describe('The name of the environment variable. Example: "MY_VAR"'),
    value: z.string().describe('The value of the environment variable. Example: "my-value"'),
    type: z.enum(['system', 'encrypted', 'plain', 'sensitive']).describe('The type of environment variable. Example: "encrypted"'),
    target: z
        .array(z.enum(['production', 'preview', 'development']))
        .optional()
        .describe('The target environment of the environment variable. Example: ["development"]'),
    gitBranch: z.string().nullable().optional().describe('If defined, the git branch of the environment variable (must have target=preview).'),
    comment: z.string().optional().describe('A comment to add context on what this environment variable is for.'),
    customEnvironmentIds: z.array(z.string()).optional().describe('The custom environment IDs associated with the environment variable.')
});

const InputSchema = z.object({
    projectId: z.string().describe('The unique project identifier or the project name. Example: "prj_123" or "my-project"'),
    envVars: z.union([EnvVarInputSchema, z.array(EnvVarInputSchema)]).describe('Single env var or array of env vars to create.'),
    upsert: z.boolean().optional().describe('If true, updates the existing environment variable instead of failing when it already exists.')
});

const ProviderEnvVarSchema = z.object({
    id: z.string().optional(),
    key: z.string(),
    value: z.string(),
    type: z.string(),
    target: z.unknown().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    gitBranch: z.string().optional(),
    comment: z.string().optional(),
    customEnvironmentIds: z.array(z.string()).optional(),
    decrypted: z.boolean().optional(),
    configurationId: z.string().nullable().optional(),
    createdBy: z.string().nullable().optional(),
    updatedBy: z.string().nullable().optional(),
    edgeConfigId: z.string().nullable().optional(),
    edgeConfigTokenId: z.string().nullable().optional(),
    system: z.boolean().optional()
});

const ProviderFailedSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string()
    })
});

const ProviderResponseSchema = z.object({
    created: z.union([ProviderEnvVarSchema, z.array(ProviderEnvVarSchema)]),
    failed: z.union([ProviderFailedSchema, z.array(ProviderFailedSchema)]).optional()
});

const OutputSchema = z.object({
    created: z.array(ProviderEnvVarSchema),
    failed: z.array(ProviderFailedSchema)
});

const action = createAction({
    description: 'Create one or more project env vars.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload = Array.isArray(input.envVars) ? input.envVars : [input.envVars];

        const config = {
            // https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables
            endpoint: `/v10/projects/${encodeURIComponent(input.projectId)}/env`,
            data: payload,
            retries: 10
        };

        if (input.upsert === true) {
            Object.assign(config, { params: { upsert: 'true' } });
        }

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const created = Array.isArray(providerResponse.created) ? providerResponse.created : providerResponse.created != null ? [providerResponse.created] : [];

        const failed = Array.isArray(providerResponse.failed) ? providerResponse.failed : providerResponse.failed != null ? [providerResponse.failed] : [];

        return { created, failed };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
