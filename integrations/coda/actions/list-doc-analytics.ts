import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().optional().describe('ID of a doc to filter analytics. Example: "AbCDeFGH"'),
    isPublished: z.boolean().optional().describe('Limit results to only published items.'),
    publishType: z.string().optional().describe('Filter by publish type.'),
    sinceDate: z.string().optional().describe('Limit results to activity on or after this date (YYYY-MM-DD). Example: "2020-08-01"'),
    untilDate: z.string().optional().describe('Limit results to activity on or before this date (YYYY-MM-DD). Example: "2020-08-05"'),
    limit: z.number().optional().describe('Maximum number of results to return. Example: 10'),
    pageToken: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const IconSchema = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    browserLink: z.string().optional()
});

const DocSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    href: z.string().optional(),
    browserLink: z.string().optional(),
    title: z.string().optional(),
    icon: IconSchema.optional(),
    createdAt: z.string().optional(),
    publishedAt: z.string().optional()
});

const MetricsItemSchema = z.object({
    date: z.string().optional(),
    views: z.number().optional(),
    copies: z.number().optional(),
    likes: z.number().optional(),
    sessionsMobile: z.number().optional(),
    sessionsDesktop: z.number().optional(),
    sessionsOther: z.number().optional(),
    totalSessions: z.number().optional(),
    aiCreditsChat: z.number().optional(),
    aiCreditsBlock: z.number().optional(),
    aiCreditsColumn: z.number().optional(),
    aiCreditsAssistant: z.number().optional(),
    aiCreditsReviewer: z.number().optional(),
    aiCredits: z.number().optional()
});

const DocAnalyticsItemSchema = z.object({
    doc: DocSchema.optional(),
    metrics: z.array(MetricsItemSchema).optional()
});

const OutputSchema = z.object({
    items: z.array(DocAnalyticsItemSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'Retrieve analytics events for docs.',
    endpoint: { method: 'GET', path: '/actions/list-doc-analytics' },
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Analytics/operation/listDocAnalytics
            endpoint: '/analytics/docs',
            params: {
                ...(input.docId !== undefined && { docIds: input.docId }),
                ...(input.isPublished !== undefined && { isPublished: String(input.isPublished) }),
                ...(input.publishType !== undefined && { publishType: input.publishType }),
                ...(input.sinceDate !== undefined && { sinceDate: input.sinceDate }),
                ...(input.untilDate !== undefined && { untilDate: input.untilDate }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const ProviderResponseSchema = z
            .object({
                items: z.array(z.unknown()),
                nextPageToken: z.string().optional()
            })
            .passthrough();

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const items = parsedResponse.items.map((item) => DocAnalyticsItemSchema.parse(item));

        return {
            items,
            ...(parsedResponse.nextPageToken !== undefined && { nextPageToken: parsedResponse.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
