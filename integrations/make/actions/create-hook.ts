import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the hook. Example: "My Webhook"'),
    teamId: z.number().describe('The unique ID of the team in which the hook will be created. Example: 2066772'),
    typeName: z.string().describe('The hook type. Example: "gateway-webhook"'),
    method: z.boolean().describe('Set to true to add the HTTP method to the request body.'),
    headers: z.boolean().describe('Set to true to add headers to the request body.'),
    stringify: z.boolean().describe('Set to true to return JSON payloads as strings.')
});

const ProviderHookSchema = z.object({
    id: z.number(),
    name: z.string(),
    teamId: z.number(),
    udid: z.string(),
    type: z.string().nullable().optional(),
    packageName: z.string().nullable().optional(),
    theme: z.string().nullable().optional(),
    flags: z
        .object({
            form: z.boolean().optional()
        })
        .nullable()
        .optional(),
    editable: z.boolean().nullable().optional(),
    queueCount: z.number().nullable().optional(),
    queueLimit: z.number().nullable().optional(),
    enabled: z.boolean().nullable().optional(),
    gone: z.boolean().nullable().optional(),
    typeName: z.string().nullable().optional(),
    data: z
        .object({
            headers: z.boolean().optional(),
            method: z.boolean().optional(),
            stringify: z.boolean().optional(),
            teamId: z.number().optional(),
            ip: z.string().optional(),
            udt: z.number().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    scenarioId: z.number().nullable().optional(),
    url: z.string()
});

const OutputSchema = ProviderHookSchema;

const action = createAction({
    description: 'Create a new custom webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/api-reference/hooks.md
            endpoint: '/hooks',
            data: {
                name: input.name,
                teamId: input.teamId,
                typeName: input.typeName,
                method: input.method,
                headers: input.headers,
                stringify: input.stringify
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider returned an empty response when creating the hook.'
            });
        }

        const parsed = z
            .object({
                hook: ProviderHookSchema
            })
            .parse(response.data);

        return parsed.hook;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
