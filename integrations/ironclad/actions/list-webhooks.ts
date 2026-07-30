import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Defaults to 0.'),
    pageSize: z.number().optional().describe('Number of webhooks per page. Defaults to 20.')
});

const WebhookSchema = z.object({
    id: z.string(),
    events: z.array(z.string()),
    targetURL: z.string(),
    companyId: z.string(),
    tags: z.array(z.string()).optional(),
    status: z.string(),
    statusLastUpdatedAt: z.string().optional(),
    statusLastUpdatedBy: z.string().optional(),
    consecutiveFailureCount: z.number(),
    firstConsecutiveFailure: z.string().optional()
});

const OutputSchema = z.object({
    webhooks: z.array(WebhookSchema),
    page: z.number(),
    pageSize: z.number(),
    nextPage: z.number().optional()
});

const action = createAction({
    description: 'List registered webhooks.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.webhooks.readWebhooks'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.page ?? 0;
        const pageSize = input.pageSize ?? 20;

        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-webhooks
            endpoint: 'public/api/v1/webhooks',
            params: {
                page: page,
                pageSize: pageSize
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                page: z.number(),
                pageSize: z.number(),
                list: z.array(z.unknown())
            })
            .parse(response.data);

        const webhooks = providerResponse.list.map((item: unknown) => {
            const raw = z
                .object({
                    id: z.string(),
                    events: z.array(z.string()),
                    targetURL: z.string(),
                    companyId: z.string(),
                    tags: z.array(z.string()).optional(),
                    status: z.string(),
                    statusLastUpdatedAt: z.string().optional(),
                    statusLastUpdatedBy: z.string().optional(),
                    consecutiveFailureCount: z.number(),
                    firstConsecutiveFailure: z.string().optional()
                })
                .parse(item);

            return {
                id: raw.id,
                events: raw.events,
                targetURL: raw.targetURL,
                companyId: raw.companyId,
                ...(raw.tags !== undefined && { tags: raw.tags }),
                status: raw.status,
                ...(raw.statusLastUpdatedAt !== undefined && { statusLastUpdatedAt: raw.statusLastUpdatedAt }),
                ...(raw.statusLastUpdatedBy !== undefined && { statusLastUpdatedBy: raw.statusLastUpdatedBy }),
                consecutiveFailureCount: raw.consecutiveFailureCount,
                ...(raw.firstConsecutiveFailure !== undefined && {
                    firstConsecutiveFailure: raw.firstConsecutiveFailure
                })
            };
        });

        const nextPage = webhooks.length === providerResponse.pageSize ? page + 1 : undefined;

        return {
            webhooks,
            page: providerResponse.page,
            pageSize: providerResponse.pageSize,
            ...(nextPage !== undefined && { nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
