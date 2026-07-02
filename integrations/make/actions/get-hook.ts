import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('Hook ID. Example: 3329421')
});

const ProviderHookSchema = z.object({
    id: z.number(),
    name: z.string(),
    typeName: z.string().optional(),
    url: z.string().optional(),
    scenarioId: z.number().nullable().optional(),
    queueCount: z.number().optional(),
    queueLimit: z.number().optional(),
    enabled: z.boolean().optional(),
    teamId: z.number().optional(),
    organizationId: z.number().optional(),
    data: z.unknown().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    lastRun: z.string().nullable().optional(),
    dataStructure: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    hook: ProviderHookSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    typeName: z.string().optional(),
    url: z.string().optional(),
    scenarioId: z.number().nullable().optional(),
    queueCount: z.number().optional(),
    queueLimit: z.number().optional(),
    enabled: z.boolean().optional(),
    teamId: z.number().optional(),
    organizationId: z.number().optional(),
    data: z.unknown().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    lastRun: z.string().nullable().optional(),
    dataStructure: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve details of a single hook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const connectionConfigSchema = z.record(z.string(), z.unknown());
        const connectionConfig = connection.connection_config ? connectionConfigSchema.parse(connection.connection_config) : {};
        const environmentUrl = connectionConfig['environmentUrl'];

        const config: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: `/api/v2/hooks/${encodeURIComponent(String(input.hookId))}`,
            retries: 3
        };

        if (typeof environmentUrl === 'string' && environmentUrl.length > 0) {
            config.baseUrlOverride = `https://${environmentUrl}`;
        }

        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response does not match expected schema.',
                details: parsed.error.issues
            });
        }

        const hook = parsed.data.hook;

        return {
            id: hook.id,
            name: hook.name,
            ...(hook.typeName !== undefined && { typeName: hook.typeName }),
            ...(hook.url !== undefined && { url: hook.url }),
            ...(hook.scenarioId !== undefined && { scenarioId: hook.scenarioId }),
            ...(hook.queueCount !== undefined && { queueCount: hook.queueCount }),
            ...(hook.queueLimit !== undefined && { queueLimit: hook.queueLimit }),
            ...(hook.enabled !== undefined && { enabled: hook.enabled }),
            ...(hook.teamId !== undefined && { teamId: hook.teamId }),
            ...(hook.organizationId !== undefined && { organizationId: hook.organizationId }),
            ...(hook.data !== undefined && { data: hook.data }),
            ...(hook.created !== undefined && { created: hook.created }),
            ...(hook.updated !== undefined && { updated: hook.updated }),
            ...(hook.lastRun !== undefined && { lastRun: hook.lastRun }),
            ...(hook.dataStructure !== undefined && { dataStructure: hook.dataStructure })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
