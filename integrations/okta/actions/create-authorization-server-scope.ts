import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    authServerId: z.string().describe('Authorization server ID. Example: "aus14u78liihuiepy698"'),
    name: z.string().describe('Scope name. Example: "nango:test:create"'),
    displayName: z.string().describe('Human-readable display name. Example: "Nango Test Create"'),
    description: z.string().describe('Scope description. Example: "Allows creating test resources"')
});

const ProviderScopeSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    system: z.boolean().optional(),
    metadataPublish: z.string().optional(),
    default: z.boolean().optional(),
    consent: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    system: z.boolean().optional(),
    metadataPublish: z.string().optional(),
    default: z.boolean().optional(),
    consent: z.string().optional()
});

const action = createAction({
    description: 'Create a custom OAuth scope on an authorization server',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.authorizationServers.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/authorization-servers/#create-a-scope
            endpoint: `/api/v1/authorizationServers/${encodeURIComponent(input.authServerId)}/scopes`,
            data: {
                name: input.name,
                displayName: input.displayName,
                description: input.description
            },
            retries: 3
        });

        const providerScope = ProviderScopeSchema.parse(response.data);

        return {
            id: providerScope.id,
            name: providerScope.name,
            ...(providerScope.displayName !== undefined && { displayName: providerScope.displayName }),
            ...(providerScope.description !== undefined && { description: providerScope.description }),
            ...(providerScope.system !== undefined && { system: providerScope.system }),
            ...(providerScope.metadataPublish !== undefined && { metadataPublish: providerScope.metadataPublish }),
            ...(providerScope.default !== undefined && { default: providerScope.default }),
            ...(providerScope.consent !== undefined && { consent: providerScope.consent })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
