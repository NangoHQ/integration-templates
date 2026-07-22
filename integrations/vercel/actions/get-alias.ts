import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    idOrAlias: z.string().describe('The alias or alias ID to be retrieved. Example: "my-alias.vercel.app"'),
    projectId: z.string().optional().describe('Filter by the project ID the alias is assigned to.'),
    teamId: z.string().optional().describe('The Team identifier to perform the request on behalf of.'),
    slug: z.string().optional().describe('The Team slug to perform the request on behalf of.')
});

const CreatorSchema = z.object({
    uid: z.string(),
    email: z.string(),
    username: z.string()
});

const DeploymentSchema = z.object({
    id: z.string(),
    url: z.string(),
    meta: z.string().optional()
});

const ProviderAliasSchema = z.object({
    alias: z.string(),
    created: z.string(),
    createdAt: z.number().nullable().optional(),
    creator: CreatorSchema.optional(),
    deletedAt: z.number().nullable().optional(),
    deployment: DeploymentSchema.optional(),
    deploymentId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    redirect: z.string().nullable().optional(),
    redirectStatusCode: z.number().nullable().optional(),
    uid: z.string(),
    updatedAt: z.number().nullable().optional(),
    protectionBypass: z.record(z.string(), z.unknown()).optional(),
    microfrontends: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    alias: z.string(),
    created: z.string(),
    createdAt: z.number().optional(),
    creator: CreatorSchema.optional(),
    deletedAt: z.number().optional(),
    deployment: DeploymentSchema.optional(),
    deploymentId: z.string().optional(),
    projectId: z.string().optional(),
    redirect: z.string().optional(),
    redirectStatusCode: z.number().optional(),
    uid: z.string(),
    updatedAt: z.number().optional(),
    protectionBypass: z.record(z.string(), z.unknown()).optional(),
    microfrontends: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single alias.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/reference#get-/v4/aliases/(idOrAlias)
            endpoint: `/v4/aliases/${encodeURIComponent(input.idOrAlias)}`,
            params: {
                ...(input.projectId !== undefined && { projectId: input.projectId }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.slug !== undefined && { slug: input.slug })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Alias not found',
                idOrAlias: input.idOrAlias
            });
        }

        const providerAlias = ProviderAliasSchema.parse(response.data);

        return {
            alias: providerAlias.alias,
            created: providerAlias.created,
            uid: providerAlias.uid,
            ...(providerAlias.createdAt != null && { createdAt: providerAlias.createdAt }),
            ...(providerAlias.creator !== undefined && { creator: providerAlias.creator }),
            ...(providerAlias.deletedAt != null && { deletedAt: providerAlias.deletedAt }),
            ...(providerAlias.deployment !== undefined && { deployment: providerAlias.deployment }),
            ...(providerAlias.deploymentId != null && { deploymentId: providerAlias.deploymentId }),
            ...(providerAlias.projectId != null && { projectId: providerAlias.projectId }),
            ...(providerAlias.redirect != null && { redirect: providerAlias.redirect }),
            ...(providerAlias.redirectStatusCode != null && { redirectStatusCode: providerAlias.redirectStatusCode }),
            ...(providerAlias.updatedAt != null && { updatedAt: providerAlias.updatedAt }),
            ...(providerAlias.protectionBypass !== undefined && { protectionBypass: providerAlias.protectionBypass }),
            ...(providerAlias.microfrontends !== undefined && { microfrontends: providerAlias.microfrontends })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
