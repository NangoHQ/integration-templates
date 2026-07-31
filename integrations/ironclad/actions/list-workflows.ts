import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Defaults to 0.'),
    pageSize: z.number().optional().describe('Number of results per page. Defaults to 20.'),
    status: z.string().optional().describe('Filter by workflow status. Accepts active, paused, completed, cancelled, or comma-separated values.'),
    template: z.string().optional().describe('Filter to a specific workflow template ID.'),
    lastUpdated: z.string().optional().describe('Retrieve workflows updated since a UTC date.'),
    filter: z.string().optional().describe('Filter workflows using a formula.'),
    search: z.string().optional().describe('Free-text search across all workflow properties.'),
    hydrateEntities: z.boolean().optional().describe('Whether to fully hydrate related entities.')
});

const WorkflowSchema = z
    .object({
        id: z.string(),
        ironcladId: z.string().optional(),
        title: z.string(),
        template: z.string(),
        step: z.string(),
        status: z.string(),
        created: z.string(),
        lastUpdated: z.string().optional()
    })
    .passthrough();

const ProviderListSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    count: z.number(),
    list: z.array(z.unknown())
});

const OutputSchema = z.object({
    page: z.number(),
    pageSize: z.number(),
    count: z.number(),
    items: z.array(WorkflowSchema),
    nextPage: z.number().optional()
});

const action = createAction({
    description: 'List contract workflows.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readWorkflows'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.status !== undefined) {
            params['status'] = input.status;
        }
        if (input.template !== undefined) {
            params['template'] = input.template;
        }
        if (input.lastUpdated !== undefined) {
            params['lastUpdated'] = input.lastUpdated;
        }
        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }
        if (input.search !== undefined) {
            params['search'] = input.search;
        }
        if (input.hydrateEntities !== undefined) {
            params['hydrateEntities'] = String(input.hydrateEntities);
        }

        // https://developer.ironcladapp.com/reference/list-all-workflows
        const response = await nango.get({
            endpoint: '/public/api/v1/workflows',
            params,
            retries: 3
        });

        const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const providerList = ProviderListSchema.parse(rawData);

        const items = providerList.list.map((item: unknown) => {
            const parsed = WorkflowSchema.parse(item);
            return parsed;
        });

        const nextPage = providerList.page * providerList.pageSize + items.length < providerList.count ? providerList.page + 1 : undefined;

        return {
            page: providerList.page,
            pageSize: providerList.pageSize,
            count: providerList.count,
            items,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
