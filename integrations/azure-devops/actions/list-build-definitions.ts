import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "MyProject"'),
    cursor: z.string().optional().describe('Pagination cursor (continuationToken) from the previous response. Omit for the first page.')
});

const ProjectSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        state: z.string().optional(),
        revision: z.number().optional(),
        visibility: z.string().optional(),
        lastUpdateTime: z.string().optional()
    })
    .passthrough();

const BuildDefinitionSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        url: z.string().optional(),
        path: z.string().optional(),
        type: z.string().optional(),
        queueStatus: z.string().optional(),
        revision: z.number().optional(),
        createdDate: z.string().optional(),
        project: ProjectSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(BuildDefinitionSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page. Omit if there are no more pages.')
});

const action = createAction({
    description: 'List build pipeline definitions in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/definitions/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/build/definitions`,
            params: {
                'api-version': '7.2-preview.7',
                ...(input.cursor && { continuationToken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.value.map((item: unknown) => {
            const parsed = BuildDefinitionSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'parse_error',
                    message: 'Failed to parse build definition from provider response',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const continuationToken = response.headers?.['x-ms-continuationtoken'];
        const nextCursor = typeof continuationToken === 'string' ? continuationToken : undefined;

        return {
            items,
            ...(nextCursor && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
