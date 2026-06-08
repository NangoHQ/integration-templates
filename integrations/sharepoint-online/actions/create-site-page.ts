import { z } from 'zod';
import { createAction } from 'nango';

const TitleAreaSchema = z
    .object({
        enableGradientEffect: z.boolean().optional(),
        imageWebUrl: z.string().optional(),
        layout: z.string().optional(),
        showAuthor: z.boolean().optional(),
        showPublishedDate: z.boolean().optional(),
        showTextBlockAboveTitle: z.boolean().optional(),
        textAboveTitle: z.string().optional(),
        textAlignment: z.string().optional(),
        imageSourceType: z.number().optional(),
        title: z.string().optional()
    })
    .passthrough();

const WebPartSchema = z
    .object({
        id: z.string().optional(),
        innerHtml: z.string().optional(),
        webPartType: z.string().optional()
    })
    .passthrough();

const HorizontalSectionColumnSchema = z
    .object({
        id: z.string().optional(),
        width: z.number().optional(),
        webparts: z.array(WebPartSchema).optional()
    })
    .passthrough();

const HorizontalSectionSchema = z
    .object({
        layout: z.string().optional(),
        id: z.string().optional(),
        emphasis: z.string().optional(),
        columns: z.array(HorizontalSectionColumnSchema).optional()
    })
    .passthrough();

const CanvasLayoutSchema = z
    .object({
        horizontalSections: z.array(HorizontalSectionSchema).optional()
    })
    .passthrough();

const InputSchema = z.object({
    siteId: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,5a58bb09-1d8d-4e19-8eb3-196471ad0dd9,9f2ec061-1f39-4f4c-9390-3210abbaa8b0"'),
    name: z.string().describe('Page file name. Example: "test.aspx"'),
    title: z.string().describe('Page title. Example: "My New Page"'),
    pageLayout: z.string().describe('Page layout type. Example: "article"'),
    showComments: z.boolean().optional(),
    showRecommendedPages: z.boolean().optional(),
    titleArea: TitleAreaSchema.optional(),
    canvasLayout: CanvasLayoutSchema.optional()
});

const ProviderSitePageSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        webUrl: z.string().optional(),
        title: z.string().optional(),
        pageLayout: z.string().optional(),
        showComments: z.boolean().optional(),
        showRecommendedPages: z.boolean().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    title: z.string().optional(),
    pageLayout: z.string().optional(),
    showComments: z.boolean().optional(),
    showRecommendedPages: z.boolean().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Create a modern site page.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-site-page',
        group: 'Site Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {
            '@odata.type': '#microsoft.graph.sitePage',
            name: input.name,
            title: input.title,
            pageLayout: input.pageLayout
        };

        if (input.showComments !== undefined) {
            payload['showComments'] = input.showComments;
        }
        if (input.showRecommendedPages !== undefined) {
            payload['showRecommendedPages'] = input.showRecommendedPages;
        }
        if (input.titleArea !== undefined) {
            payload['titleArea'] = input.titleArea;
        }
        if (input.canvasLayout !== undefined) {
            payload['canvasLayout'] = input.canvasLayout;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/sitepage-create
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/pages`,
            data: payload,
            retries: 3
        });

        const providerPage = ProviderSitePageSchema.parse(response.data);

        return {
            id: providerPage.id,
            ...(providerPage.name !== undefined && { name: providerPage.name }),
            ...(providerPage.webUrl !== undefined && { webUrl: providerPage.webUrl }),
            ...(providerPage.title !== undefined && { title: providerPage.title }),
            ...(providerPage.pageLayout !== undefined && { pageLayout: providerPage.pageLayout }),
            ...(providerPage.showComments !== undefined && { showComments: providerPage.showComments }),
            ...(providerPage.showRecommendedPages !== undefined && { showRecommendedPages: providerPage.showRecommendedPages }),
            ...(providerPage.createdDateTime !== undefined && { createdDateTime: providerPage.createdDateTime }),
            ...(providerPage.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerPage.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
