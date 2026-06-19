import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangoapi"'),
    query: z.string().describe('WIQL query string. Example: "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = \'Bug\'"'),
    top: z.number().optional().describe('Maximum number of work items to return.')
});

const ProviderWiqlResponseSchema = z.object({
    queryType: z.string().optional(),
    workItems: z
        .array(
            z.object({
                id: z.number()
            })
        )
        .optional(),
    workItemRelations: z
        .array(
            z.object({
                target: z
                    .object({
                        id: z.number()
                    })
                    .optional()
            })
        )
        .optional()
});

const ProviderWorkItemsResponseSchema = z.object({
    value: z
        .array(
            z.object({
                id: z.number(),
                rev: z.number().optional(),
                url: z.string().optional(),
                fields: z.record(z.string(), z.unknown()).optional(),
                relations: z.array(z.unknown()).optional()
            })
        )
        .optional()
});

const WorkItemSchema = z.object({
    id: z.number(),
    rev: z.number().optional(),
    url: z.string().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    relations: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    work_items: z.array(WorkItemSchema)
});

const BATCH_SIZE = 200;

const action = createAction({
    description: 'Run a WIQL query to get matching work item IDs, then hydrate fields in batches.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.work'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const wiqlConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/wiql`,
            params: {
                'api-version': '7.2-preview.2',
                ...(input.top !== undefined && { $top: input.top })
            },
            data: {
                query: input.query
            },
            retries: 3
        };

        const wiqlResponse = await nango.post(wiqlConfig);
        const providerResult = ProviderWiqlResponseSchema.parse(wiqlResponse.data);

        let ids: number[];
        const queryType = providerResult.queryType;
        if (queryType === 'tree' || queryType === 'oneHop') {
            const seen = new Set<number>();
            ids = (providerResult.workItemRelations ?? [])
                .map((rel) => rel.target?.id)
                .filter((id): id is number => id !== undefined && !seen.has(id) && seen.add(id) !== undefined);
        } else {
            ids = providerResult.workItems?.map((item) => item.id) ?? [];
        }

        if (ids.length === 0) {
            return {
                work_items: []
            };
        }

        const workItems: z.infer<typeof WorkItemSchema>[] = [];
        const chunks = Array.from({ length: Math.ceil(ids.length / BATCH_SIZE) }, (_, i) => ids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));

        for (const batch of chunks) {
            const idsParam = batch.join(',');

            const batchConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/list?view=azure-devops-rest-7.2
                endpoint: `/${encodeURIComponent(input.project)}/_apis/wit/workitems`,
                params: {
                    ids: idsParam,
                    $expand: 'all',
                    'api-version': '7.2-preview'
                },
                retries: 3
            };

            const batchResponse = await nango.get(batchConfig);
            const batchData = ProviderWorkItemsResponseSchema.parse(batchResponse.data);
            const items = batchData.value ?? [];

            for (const item of items) {
                workItems.push({
                    id: item.id,
                    ...(item.rev !== undefined && { rev: item.rev }),
                    ...(item.url !== undefined && { url: item.url }),
                    ...(item.fields !== undefined && { fields: item.fields }),
                    ...(item.relations !== undefined && { relations: item.relations })
                });
            }
        }

        return {
            work_items: workItems
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
