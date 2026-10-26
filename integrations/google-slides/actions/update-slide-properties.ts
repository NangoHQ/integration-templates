import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the slide. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        slideObjectId: z.string().describe('The object ID of the slide to update. Example: "slide_test_1"'),
        isSkipped: z
            .boolean()
            .describe('Whether the slide should be skipped during slideshow playback. Set true to exclude the slide from the presentation without deleting it.')
    })
    .describe('Input for updating the properties of a slide in a Google Slides presentation.');

const SlidePropertiesSchema = z.object({
    layoutObjectId: z.string().optional(),
    masterObjectId: z.string().optional(),
    isSkipped: z.boolean().optional()
});

const PageSchema = z.object({
    objectId: z.string(),
    slideProperties: SlidePropertiesSchema.optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation the slide belongs to.'),
        slideObjectId: z.string().describe('The object ID of the slide that was updated.'),
        isSkipped: z
            .boolean()
            .describe('The confirmed skip state of the slide read back after the update. Defaults to false when the provider omits the field.'),
        layoutObjectId: z.string().optional().describe('Read-only object ID of the layout the slide is based on.'),
        masterObjectId: z.string().optional().describe('Read-only object ID of the master the slide is based on.')
    })
    .describe('The slide properties confirmed after the update, including the skip state.');

/**
 * @tags: [write]
 * @tagReason: Applies an updateSlideProperties batchUpdate request that mutates a slide's settings on an existing presentation.
 * @pitfalls: Only isSkipped is settable (layoutObjectId, masterObjectId, and notesPage are read-only); a false isSkipped is omitted by the provider and reported back as false; passing a non-slide page object ID fails instead of updating.
 */
const action = createAction({
    description: 'Update slide-level settings such as skipping a slide during playback.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateSlideProperties: {
                            objectId: input.slideObjectId,
                            slideProperties: {
                                isSkipped: input.isSkipped
                            },
                            // isSkipped is the only writable slide property.
                            fields: 'isSkipped'
                        }
                    }
                ]
            },
            // Setting isSkipped assigns an absolute boolean, so replaying this request is idempotent.
            retries: 3
        });

        // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
        const response = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.slideObjectId)}`,
            params: {
                fields: 'objectId,slideProperties(layoutObjectId,masterObjectId,isSkipped)'
            },
            retries: 3
        });

        const page = PageSchema.parse(response.data);

        if (!page.slideProperties) {
            throw new nango.ActionError({
                type: 'not_a_slide',
                message: `The page ${input.slideObjectId} is not a slide and has no slide properties.`
            });
        }

        return {
            presentationId: input.presentationId,
            slideObjectId: page.objectId,
            isSkipped: page.slideProperties.isSkipped ?? false,
            ...(page.slideProperties.layoutObjectId != null && { layoutObjectId: page.slideProperties.layoutObjectId }),
            ...(page.slideProperties.masterObjectId != null && { masterObjectId: page.slideProperties.masterObjectId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
