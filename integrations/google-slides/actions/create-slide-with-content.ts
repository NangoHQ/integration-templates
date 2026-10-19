import { z } from 'zod';
import { createAction } from 'nango';

const PredefinedLayoutSchema = z.enum([
    'BLANK',
    'CAPTION_ONLY',
    'TITLE',
    'TITLE_AND_BODY',
    'TITLE_AND_TWO_COLUMNS',
    'TITLE_ONLY',
    'SECTION_HEADER',
    'SECTION_TITLE_AND_DESCRIPTION',
    'ONE_COLUMN_TEXT',
    'MAIN_POINT',
    'BIG_NUMBER'
]);

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to add the slide to. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'),
        title: z.string().optional().describe('Text to insert into the title placeholder of the new slide. Omit to leave the title empty.'),
        body: z.string().optional().describe('Text to insert into the body placeholder of the new slide. Omit to leave the body empty.'),
        predefinedLayout: PredefinedLayoutSchema.optional().describe('Predefined layout for the new slide. Defaults to "TITLE_AND_BODY".'),
        insertionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Zero-based position at which to insert the slide. Omit to append it at the end of the presentation.'),
        slideObjectId: z
            .string()
            .optional()
            .describe('Optional custom object ID for the new slide. Must be 5-50 characters and unique across the entire presentation.')
    })
    .describe('Input for creating a slide with a title and body in a Google Slides presentation.');

const CreateSlideReplySchema = z.object({
    createSlide: z
        .object({
            objectId: z.string()
        })
        .optional()
});

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z.array(CreateSlideReplySchema).optional()
});

const PlaceholderSchema = z.object({
    type: z.string().optional(),
    index: z.number().optional()
});

const PageElementSchema = z.object({
    objectId: z.string(),
    shape: z
        .object({
            placeholder: PlaceholderSchema.optional()
        })
        .optional()
});

const PageSchema = z.object({
    objectId: z.string(),
    pageElements: z.array(PageElementSchema).optional()
});

const OutputSchema = z
    .object({
        slideObjectId: z.string().describe('Object ID of the newly created slide.'),
        predefinedLayout: z.string().describe('The predefined layout applied to the new slide.'),
        titlePlaceholderObjectId: z
            .string()
            .optional()
            .describe('Object ID of the discovered title placeholder, omitted when the layout has no title placeholder.'),
        bodyPlaceholderObjectId: z
            .string()
            .optional()
            .describe('Object ID of the discovered body placeholder, omitted when the layout has no body placeholder.'),
        titleInserted: z.boolean().describe('Whether the supplied title text was inserted into the title placeholder.'),
        bodyInserted: z.boolean().describe('Whether the supplied body text was inserted into the body placeholder.'),
        message: z.string().describe('Human-readable summary of the outcome, including a note when the layout had no title/body placeholders to fill.')
    })
    .describe('Result of creating a slide and inserting its title and body text.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the newly created slide to discover its auto-generated placeholder IDs, then writes the title and body text into them.
 * @pitfalls: Only TITLE/CENTERED_TITLE and BODY placeholders are filled, so other layouts (e.g. BLANK, or TITLE with a SUBTITLE) still create the slide but place little or none of the supplied text; a custom slideObjectId must be 5-50 characters and unique across the entire presentation; if inserting the text fails, the new slide is deleted (best effort) before the error is returned.
 */
const action = createAction({
    description:
        'Create a new slide with a title/body layout and fill its title and body placeholders in one call, discovering the generated placeholder object IDs automatically.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const layout = input.predefinedLayout ?? 'TITLE_AND_BODY';

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        const createResponse = await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        createSlide: {
                            ...(input.slideObjectId !== undefined && { objectId: input.slideObjectId }),
                            ...(input.insertionIndex !== undefined && { insertionIndex: input.insertionIndex }),
                            slideLayoutReference: {
                                predefinedLayout: layout
                            }
                        }
                    }
                ]
            },
            // Non-idempotent create: a retry after a lost response would create a duplicate slide.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const createParsed = BatchUpdateResponseSchema.parse(createResponse.data);
        const createdReply = createParsed.replies?.find((reply) => reply.createSlide !== undefined);
        const slideObjectId = createdReply?.createSlide?.objectId;

        if (!slideObjectId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'The Slides API did not return the object ID of the newly created slide.'
            });
        }

        // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
        const pageResponse = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(slideObjectId)}`,
            retries: 3
        });

        const page = PageSchema.parse(pageResponse.data);
        const elements = page.pageElements ?? [];

        const titleElement = elements.find((element) => {
            const type = element.shape?.placeholder?.type;
            return type === 'TITLE' || type === 'CENTERED_TITLE';
        });
        const bodyElement = elements.find((element) => element.shape?.placeholder?.type === 'BODY');

        const titlePlaceholderObjectId = titleElement?.objectId;
        const bodyPlaceholderObjectId = bodyElement?.objectId;

        const requests: Array<{ insertText: { objectId: string; text: string; insertionIndex: number } }> = [];
        if (input.title !== undefined && input.title.length > 0 && titlePlaceholderObjectId !== undefined) {
            requests.push({ insertText: { objectId: titlePlaceholderObjectId, text: input.title, insertionIndex: 0 } });
        }
        if (input.body !== undefined && input.body.length > 0 && bodyPlaceholderObjectId !== undefined) {
            requests.push({ insertText: { objectId: bodyPlaceholderObjectId, text: input.body, insertionIndex: 0 } });
        }

        if (requests.length > 0) {
            // @allowTryCatch Roll back the new slide when the text insert fails, then rethrow.
            try {
                // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
                await nango.post({
                    endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
                    data: { requests },
                    // Non-idempotent text insert: a retry after a lost response would duplicate the inserted text.
                    // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                    retries: 0
                });
            } catch (error) {
                // @allowTryCatch Best-effort rollback: a failed cleanup must not mask the original error.
                try {
                    // https://developers.google.com/slides/api/reference/rest/v1/presentations/request#DeleteObjectRequest
                    await nango.post({
                        endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
                        data: { requests: [{ deleteObject: { objectId: slideObjectId } }] },
                        // Deleting the slide again after a lost response would fail on the missing object, so this is not retried.
                        // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                        retries: 0
                    });
                } catch {
                    await nango.log(`Failed to clean up slide ${slideObjectId} after the text insert failed; it may need to be deleted manually.`, { level: 'warn' });
                }
                throw error;
            }
        }

        const titleInserted = input.title !== undefined && input.title.length > 0 && titlePlaceholderObjectId !== undefined;
        const bodyInserted = input.body !== undefined && input.body.length > 0 && bodyPlaceholderObjectId !== undefined;

        const insertedParts: string[] = [];
        if (titleInserted) {
            insertedParts.push('title');
        }
        if (bodyInserted) {
            insertedParts.push('body');
        }

        let message: string;
        if (titlePlaceholderObjectId === undefined && bodyPlaceholderObjectId === undefined) {
            message = 'The selected layout has no title/body placeholders to fill; the slide was created without text.';
        } else if (insertedParts.length > 0) {
            message = `Inserted text into the slide ${insertedParts.join(' and ')}.`;
        } else {
            message = 'Found title/body placeholders but no title or body text was supplied.';
        }

        return {
            slideObjectId,
            predefinedLayout: layout,
            ...(titlePlaceholderObjectId !== undefined && { titlePlaceholderObjectId }),
            ...(bodyPlaceholderObjectId !== undefined && { bodyPlaceholderObjectId }),
            titleInserted,
            bodyInserted,
            message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
