import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"'),
    pageIdOrName: z.string().describe('Page ID or page name. Example: "canvas-51lnQjKXyv"')
});

const PageReferenceSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        href: z.string(),
        browserLink: z.string(),
        name: z.string()
    })
    .passthrough();

const PersonSchema = z
    .object({
        name: z.string().optional(),
        email: z.string().optional()
    })
    .passthrough();

const IconSchema = z
    .object({
        name: z.string().optional(),
        type: z.string().optional(),
        browserLink: z.string().optional()
    })
    .passthrough();

const ImageSchema = z
    .object({
        browserLink: z.string().optional(),
        type: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional()
    })
    .passthrough();

const ProviderPageSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    browserLink: z.string(),
    isHidden: z.boolean(),
    isEffectivelyHidden: z.boolean(),
    contentType: z.string(),
    children: z.array(PageReferenceSchema),
    subtitle: z.string().nullable().optional(),
    icon: IconSchema.nullable().optional(),
    image: ImageSchema.nullable().optional(),
    parent: PageReferenceSchema.nullable().optional(),
    authors: z.array(PersonSchema).nullable().optional(),
    createdAt: z.string().nullable().optional(),
    createdBy: PersonSchema.nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    updatedBy: PersonSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    href: z.string().optional(),
    browserLink: z.string().optional(),
    isHidden: z.boolean().optional(),
    isEffectivelyHidden: z.boolean().optional(),
    contentType: z.string().optional(),
    children: z.array(PageReferenceSchema).optional(),
    subtitle: z.string().optional(),
    icon: IconSchema.optional(),
    image: ImageSchema.optional(),
    parent: PageReferenceSchema.optional(),
    authors: z.array(PersonSchema).optional(),
    createdAt: z.string().optional(),
    createdBy: PersonSchema.optional(),
    updatedAt: z.string().optional(),
    updatedBy: PersonSchema.optional()
});

const action = createAction({
    description: 'Retrieve a single page by ID or name.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-page' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1
            endpoint: `/docs/${encodeURIComponent(input.docId)}/pages/${encodeURIComponent(input.pageIdOrName)}`,
            retries: 3
        });

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            type: providerPage.type,
            name: providerPage.name,
            href: providerPage.href,
            browserLink: providerPage.browserLink,
            isHidden: providerPage.isHidden,
            isEffectivelyHidden: providerPage.isEffectivelyHidden,
            contentType: providerPage.contentType,
            children: providerPage.children,
            ...(providerPage.subtitle != null && { subtitle: providerPage.subtitle }),
            ...(providerPage.icon != null && { icon: providerPage.icon }),
            ...(providerPage.image != null && { image: providerPage.image }),
            ...(providerPage.parent != null && { parent: providerPage.parent }),
            ...(providerPage.authors != null && { authors: providerPage.authors }),
            ...(providerPage.createdAt != null && { createdAt: providerPage.createdAt }),
            ...(providerPage.createdBy != null && { createdBy: providerPage.createdBy }),
            ...(providerPage.updatedAt != null && { updatedAt: providerPage.updatedAt }),
            ...(providerPage.updatedBy != null && { updatedBy: providerPage.updatedBy })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
