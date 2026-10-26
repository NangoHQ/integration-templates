import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number().optional().describe('Numeric value of the dimension.'),
    unit: z.string().optional().describe('Unit of the dimension, such as "EMU" or "PT".')
});

const SizeSchema = z.object({
    width: DimensionSchema.optional().describe('Width of the page element.'),
    height: DimensionSchema.optional().describe('Height of the page element.')
});

const AffineTransformSchema = z.object({
    scaleX: z.number().optional().describe('Horizontal scale factor of the element.'),
    scaleY: z.number().optional().describe('Vertical scale factor of the element.'),
    shearX: z.number().optional().describe('Horizontal shear factor of the element.'),
    shearY: z.number().optional().describe('Vertical shear factor of the element.'),
    translateX: z.number().optional().describe('Horizontal translation of the element in EMUs.'),
    translateY: z.number().optional().describe('Vertical translation of the element in EMUs.'),
    unit: z.string().optional().describe('Unit of the transform, typically "EMU".')
});

const PlaceholderSchema = z.object({
    type: z.string().optional().describe('Placeholder type, such as TITLE, BODY, or CENTERED_TITLE.'),
    index: z.number().optional().describe('Index of the placeholder among placeholders of the same type.'),
    parentObjectId: z.string().optional().describe('Object ID of the layout or master placeholder this placeholder inherits from.')
});

const ShapeSchema = z
    .object({
        shapeType: z.string().optional().describe('Shape type, such as TEXT_BOX, RECTANGLE, or ELLIPSE.'),
        text: z.record(z.string(), z.unknown()).optional().describe('Text content of the shape, including paragraphs and text runs.'),
        placeholder: PlaceholderSchema.optional().describe('Placeholder metadata when the shape is a placeholder.'),
        shapeProperties: z.record(z.string(), z.unknown()).optional().describe('Fill, outline, shadow, and autofit properties of the shape.')
    })
    .passthrough();

const ImageSchema = z
    .object({
        contentUrl: z.string().optional().describe('Ephemeral URL where the stored image can be fetched.'),
        sourceUrl: z.string().optional().describe('Original image URL supplied when the image was inserted.'),
        imageProperties: z.record(z.string(), z.unknown()).optional().describe('Crop, transparency, and outline properties of the image.')
    })
    .passthrough();

const TableSchema = z
    .object({
        rows: z.number().optional().describe('Number of rows in the table.'),
        columns: z.number().optional().describe('Number of columns in the table.'),
        tableRows: z.array(z.record(z.string(), z.unknown())).optional().describe('Rows and cells of the table, including their text and properties.')
    })
    .passthrough();

const PageElementSchema = z
    .object({
        objectId: z.string().describe('Unique object ID of the page element.'),
        type: z.string().optional().describe('Element type, such as IMAGE, SHAPE, TABLE, or GROUP; omitted for some shape elements.'),
        size: SizeSchema.optional().describe('Rendered size of the element.'),
        transform: AffineTransformSchema.optional().describe('Placement and scaling of the element on the page.'),
        title: z.string().optional().describe('Accessible title of the element.'),
        description: z.string().optional().describe('Accessible description of the element.'),
        shape: ShapeSchema.optional().describe('Shape data when the element is a shape or text box.'),
        image: ImageSchema.optional().describe('Image data when the element is an image.'),
        table: TableSchema.optional().describe('Table data when the element is a table.'),
        line: z.record(z.string(), z.unknown()).optional().describe('Line data when the element is a line connector.'),
        video: z.record(z.string(), z.unknown()).optional().describe('Video data when the element is a video embed.'),
        wordArt: z.record(z.string(), z.unknown()).optional().describe('Word art data when the element is word art.'),
        sheetsChart: z.record(z.string(), z.unknown()).optional().describe('Chart data when the element is an embedded Google Sheets chart.'),
        linkedChart: z.record(z.string(), z.unknown()).optional().describe('Chart data when the element is a linked chart.'),
        elementGroup: z.record(z.string(), z.unknown()).optional().describe('Group data when the element groups other page elements.')
    })
    .passthrough();

const InputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation that contains the page. Example: "1AbCdEfGhIjKlMnOpQrStUvWxYz"'),
        pageId: z.string().describe('Object ID of the page to fetch, such as a slide, layout, master, or notes page. Example: "slide_1"')
    })
    .describe('Identifies the presentation and the page to fetch from Google Slides.');

const OutputSchema = z
    .object({
        objectId: z.string().describe('Unique object ID of the page.'),
        pageType: z.string().optional().describe('Page type, such as SLIDE, LAYOUT, MASTER, NOTES, or NOTES_MASTER; omitted for ordinary slides.'),
        revisionId: z.string().optional().describe('Revision ID of the presentation at the time the page was read.'),
        pageElements: z.array(PageElementSchema).optional().describe('Elements on the page; omitted entirely when the page has no elements.'),
        pageProperties: z.record(z.string(), z.unknown()).optional().describe('Background fill and other page-level properties.'),
        slideProperties: z.record(z.string(), z.unknown()).optional().describe('Layout, master, notes page, and skipped state for slide pages.'),
        layoutProperties: z.record(z.string(), z.unknown()).optional().describe('Layout metadata for layout pages.'),
        notesProperties: z.record(z.string(), z.unknown()).optional().describe('Speaker notes metadata for notes pages.'),
        commentsViewMode: z.string().optional().describe('Whether comments are shown or hidden for the page.')
    })
    .passthrough()
    .describe('A Google Slides page, which can be a slide, layout, master, notes page, or notes master.');

/**
 * @tags: [read]
 * @tagReason: Reads a single presentation page from Google Slides without modifying it.
 * @pitfalls: A page with no elements omits pageElements entirely (treat it as zero elements), ordinary slides omit pageType, and a nonexistent presentation or page returns a 404 NOT_FOUND error.
 */
const action = createAction({
    description: 'Fetch a single slide (or other page type) by its object ID.',
    version: '1.0.0',
    scopes: ['https://www.googleapis.com/auth/presentations'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
        const response = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.pageId)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
