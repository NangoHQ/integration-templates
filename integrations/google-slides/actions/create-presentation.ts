import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        title: z.string().describe('Title for the new presentation. Example: "Quarterly Review"')
    })
    .describe('Input for creating a new, blank Google Slides presentation.');

const ProviderPlaceholderSchema = z.object({
    type: z.string().optional(),
    index: z.number().optional(),
    parentObjectId: z.string().optional()
});

const ProviderShapeSchema = z.object({
    placeholder: ProviderPlaceholderSchema.optional()
});

const ProviderPageElementSchema = z.object({
    objectId: z.string(),
    shape: ProviderShapeSchema.optional()
});

const ProviderSlidePropertiesSchema = z.object({
    layoutObjectId: z.string().optional()
});

const ProviderPageSchema = z.object({
    objectId: z.string(),
    slideProperties: ProviderSlidePropertiesSchema.optional(),
    pageElements: z.array(ProviderPageElementSchema).optional()
});

const ProviderPresentationSchema = z.object({
    presentationId: z.string(),
    title: z.string().optional(),
    revisionId: z.string().optional(),
    slides: z.array(ProviderPageSchema).optional()
});

const SlideSchema = z.object({
    objectId: z.string().describe('Unique object ID of the slide within the presentation. Example: "p"'),
    layoutObjectId: z.string().optional().describe('Object ID of the layout this slide inherits from, if any.'),
    pageElements: z
        .array(
            z.object({
                objectId: z.string().describe('Unique object ID of the page element, used to target it in later batchUpdate requests.'),
                placeholderType: z.string().optional().describe('Placeholder type when the element is a placeholder shape. Example: "CENTERED_TITLE"')
            })
        )
        .optional()
        .describe('Page elements on the slide. Omitted entirely when the slide has no elements.')
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('ID of the newly created presentation. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        title: z.string().describe('Title of the newly created presentation.'),
        revisionId: z.string().optional().describe('Opaque revision ID of the new presentation, valid for about 24 hours.'),
        slides: z.array(SlideSchema).describe('Slides present in the new presentation. A freshly created deck always contains exactly one default slide.')
    })
    .describe('The newly created Google Slides presentation, including its default slide and placeholder object IDs.');

/**
 * @tags: [write]
 * @tagReason: Creates a new presentation in the user's Google Drive via presentations.create; it does not delete, clear, or irreversibly modify any existing provider data.
 * @pitfalls: Only the title is honored, so the new deck always starts with exactly one default slide whose placeholder object IDs are auto-generated, and any other content must be added in a later call. The Slides API has no delete endpoint, so removing the deck requires the Google Drive API (files.delete or moving it to trash), which needs a Drive scope.
 */
const action = createAction({
    description: 'Create a new, blank Google Slides presentation with a title.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/create
        const response = await nango.post({
            endpoint: '/v1/presentations',
            data: {
                title: input.title
            },
            // Creating a presentation is not idempotent: a retry after a lost response would create a duplicate deck.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const presentation = ProviderPresentationSchema.parse(response.data);

        return {
            presentationId: presentation.presentationId,
            title: presentation.title ?? input.title,
            ...(presentation.revisionId != null && { revisionId: presentation.revisionId }),
            slides: (presentation.slides ?? []).map((slide) => ({
                objectId: slide.objectId,
                ...(slide.slideProperties?.layoutObjectId != null && { layoutObjectId: slide.slideProperties.layoutObjectId }),
                ...(slide.pageElements != null && {
                    pageElements: slide.pageElements.map((element) => ({
                        objectId: element.objectId,
                        ...(element.shape?.placeholder?.type != null && { placeholderType: element.shape.placeholder.type })
                    }))
                })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
