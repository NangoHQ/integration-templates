import { createAction } from 'nango';
import { z } from 'zod';

const DimensionSchema = z
    .object({
        magnitude: z.number().optional().describe('Numeric value of the dimension. Example: 9144000'),
        unit: z.string().optional().describe('Unit the magnitude is expressed in. Example: "EMU"')
    })
    .passthrough();

const SizeSchema = z
    .object({
        width: DimensionSchema.optional().describe('Width of the page or page element.'),
        height: DimensionSchema.optional().describe('Height of the page or page element.')
    })
    .passthrough();

const PageElementSchema = z
    .object({
        objectId: z.string().describe('Unique object ID of the page element. Example: "SLIDES_API1607775223_0"'),
        size: SizeSchema.optional().describe('Rendered size of the page element.'),
        transform: z.unknown().optional().describe('Placement transform (scale and translate values in EMU) of the page element.'),
        title: z.string().optional().describe('Optional title of the page element.'),
        description: z.string().optional().describe('Optional alt-text description of the page element.'),
        shape: z
            .unknown()
            .optional()
            .describe('Shape content, present when the element is a shape or text box, including its shapeType, text, and shapeProperties.'),
        image: z.unknown().optional().describe('Image content, present when the element is an image, including its contentUrl and sourceUrl.'),
        video: z.unknown().optional().describe('Video content, present when the element is an embedded video.'),
        line: z.unknown().optional().describe('Line content, present when the element is a line connector.'),
        table: z.unknown().optional().describe('Table content, present when the element is a table, including its rows, columns, and cells.'),
        elementGroup: z.unknown().optional().describe('Group content, present when the element is a group of page elements.'),
        sheetsChart: z.unknown().optional().describe('Linked Sheets chart content, present when the element is an embedded chart.'),
        speakerNotes: z.unknown().optional().describe('Speaker notes content, present when the element carries speaker notes.')
    })
    .passthrough();

const PageSchema = z
    .object({
        objectId: z.string().describe('Unique object ID of the page. Example: "slide_test_1"'),
        pageType: z.string().optional().describe('Type of the page: SLIDE, MASTER, LAYOUT, NOTES, or NOTES_MASTER.'),
        pageElements: z
            .array(PageElementSchema)
            .optional()
            .describe('Elements on the page in order; the key is omitted entirely when the page has no elements.'),
        pageProperties: z.unknown().optional().describe('Background fill and color scheme of the page.'),
        slideProperties: z.unknown().optional().describe('Slide-specific properties such as layoutObjectId, masterObjectId, and notesPage.'),
        layoutProperties: z.unknown().optional().describe('Layout-specific properties such as masterObjectId, name, and displayName.'),
        masterProperties: z.unknown().optional().describe('Master-specific properties such as displayName.'),
        notesProperties: z.unknown().optional().describe('Notes-specific properties such as the speaker notes shape.')
    })
    .passthrough();

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to retrieve. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"')
    })
    .describe('Identifies the presentation to fetch by its Google Slides presentation ID.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation.'),
        title: z.string().optional().describe('Title of the presentation.'),
        locale: z.string().optional().describe('Locale of the presentation as an IETF BCP 47 language tag. Example: "en"'),
        revisionId: z.string().optional().describe('Revision ID of the presentation, useful for detecting changes between reads.'),
        commentsViewMode: z.string().optional().describe('How comments are displayed in the presentation.'),
        pageSize: SizeSchema.optional().describe('Default page size of the slides in the presentation.'),
        slides: z.array(PageSchema).optional().describe('The slides in the presentation, in order.'),
        masters: z.array(PageSchema).optional().describe('The masters in the presentation.'),
        layouts: z.array(PageSchema).optional().describe('The layouts in the presentation.'),
        notesMaster: PageSchema.optional().describe('The notes master of the presentation.')
    })
    .passthrough()
    .describe('The full structure of a Google Slides presentation, including its slides, page elements, masters, layouts, and notes master.');

/**
 * @tags: [read]
 * @tagReason: Fetches a presentation's full structure from the Google Slides API without modifying any provider data.
 * @pitfalls: A slide with no page elements omits the pageElements key entirely rather than returning an empty array, and a nonexistent or inaccessible presentationId returns a 404 error.
 */
const action = createAction({
    description: "Fetch a presentation's full structure - every slide, page element, and metadata - in one call.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const response = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}`,
            retries: 3
        });

        const parsed = OutputSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_response_error',
                message: 'Failed to parse the presentation response from the Google Slides API.',
                details: parsed.error.message
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
