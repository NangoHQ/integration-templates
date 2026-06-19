import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or name. Example: "nangoapi"'),
    buildDefinitionId: z.number().describe('Build definition ID. Example: 1'),
    sourceBranch: z.string().optional().describe('Source branch reference. Example: "refs/heads/main"'),
    parameters: z.string().optional().describe('Build parameters as a JSON string. Example: \'{"system.debug":"true"}\'')
});

const DefinitionReferenceSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const TeamProjectReferenceSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const ProviderBuildSchema = z.object({
    id: z.number().optional(),
    buildNumber: z.string().optional(),
    status: z.string().optional(),
    result: z.string().optional(),
    sourceBranch: z.string().optional(),
    sourceVersion: z.string().optional(),
    url: z.string().optional(),
    definition: DefinitionReferenceSchema.optional(),
    project: TeamProjectReferenceSchema.optional()
});

const OutputSchema = z.object({
    id: z.number().optional(),
    buildNumber: z.string().optional(),
    status: z.string().optional(),
    result: z.string().optional(),
    sourceBranch: z.string().optional(),
    sourceVersion: z.string().optional(),
    url: z.string().optional(),
    definition: z
        .object({
            id: z.number().optional(),
            name: z.string().optional()
        })
        .optional(),
    project: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Queue a classic build.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build_execute'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: { definition: { id: number }; sourceBranch?: string; parameters?: string } = {
            definition: {
                id: input.buildDefinitionId
            }
        };

        if (input.sourceBranch !== undefined) {
            data.sourceBranch = input.sourceBranch;
        }

        if (input.parameters !== undefined) {
            data.parameters = input.parameters;
        }

        // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/builds/queue?view=azure-devops-rest-7.2
        const response = await nango.post({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/build/builds`,
            params: {
                'api-version': '7.2-preview.7'
            },
            data,
            retries: 10
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Azure DevOps API'
            });
        }

        const providerBuild = ProviderBuildSchema.parse(response.data);

        return {
            ...(providerBuild.id !== undefined && { id: providerBuild.id }),
            ...(providerBuild.buildNumber !== undefined && { buildNumber: providerBuild.buildNumber }),
            ...(providerBuild.status !== undefined && { status: providerBuild.status }),
            ...(providerBuild.result !== undefined && { result: providerBuild.result }),
            ...(providerBuild.sourceBranch !== undefined && { sourceBranch: providerBuild.sourceBranch }),
            ...(providerBuild.sourceVersion !== undefined && { sourceVersion: providerBuild.sourceVersion }),
            ...(providerBuild.url !== undefined && { url: providerBuild.url }),
            ...(providerBuild.definition !== undefined && {
                definition: {
                    ...(providerBuild.definition.id !== undefined && { id: providerBuild.definition.id }),
                    ...(providerBuild.definition.name !== undefined && { name: providerBuild.definition.name })
                }
            }),
            ...(providerBuild.project !== undefined && {
                project: {
                    ...(providerBuild.project.id !== undefined && { id: providerBuild.project.id }),
                    ...(providerBuild.project.name !== undefined && { name: providerBuild.project.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
