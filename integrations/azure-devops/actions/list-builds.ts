import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "MyProject"'),
    minTime: z.string().optional().describe('Minimum queue time filter (ISO 8601). Example: "2024-01-01T00:00:00Z"'),
    cursor: z.string().optional().describe('Continuation token from the previous response. Omit for the first page.')
});

const BuildDefinitionSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const ProjectReferenceSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional()
});

const IdentityRefSchema = z.object({
    id: z.string().optional(),
    displayName: z.string().optional()
});

const BuildSchema = z.object({
    id: z.number(),
    buildNumber: z.string().optional(),
    status: z.string().optional(),
    result: z.string().optional(),
    queueTime: z.string().optional(),
    startTime: z.string().optional(),
    finishTime: z.string().optional(),
    url: z.string().optional(),
    definition: BuildDefinitionSchema.optional(),
    project: ProjectReferenceSchema.optional(),
    sourceBranch: z.string().optional(),
    requestedFor: IdentityRefSchema.optional()
});

const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(z.unknown())
});

const OutputSchema = z.object({
    items: z.array(BuildSchema),
    continuationToken: z.string().optional()
});

function extractContinuationToken(headers: Record<string, unknown>): string | undefined {
    const raw = headers['x-ms-continuationtoken'];
    if (typeof raw === 'string' && raw !== '') {
        return raw;
    }
    return undefined;
}

const action = createAction({
    description: 'List builds in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            'api-version': '7.2-preview.7',
            queryOrder: 'queueTimeDescending'
        };

        if (input.minTime !== undefined) {
            params['minTime'] = input.minTime;
        }

        if (input.cursor !== undefined) {
            params['continuationToken'] = input.cursor;
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/build/builds/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/build/builds`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items: z.infer<typeof BuildSchema>[] = [];
        for (const rawBuild of providerResponse.value) {
            items.push(BuildSchema.parse(rawBuild));
        }

        const continuationToken = extractContinuationToken(response.headers);

        return {
            items,
            ...(continuationToken !== undefined && { continuationToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
