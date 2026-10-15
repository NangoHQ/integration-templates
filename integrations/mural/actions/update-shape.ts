import { z } from 'zod';
import { createAction } from 'nango';

const InputStyleSchema = z.object({
    backgroundColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{8}$/)
        .optional()
        .describe('New background color of the shape in 8-digit hex with alpha format. Example: "#FCFE7DFF".'),
    borderColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{8}$/)
        .optional()
        .describe('New border color of the shape in 8-digit hex with alpha format. Example: "#000000FF".'),
    borderStyle: z.enum(['solid', 'dotted']).optional().describe('New border style of the shape.'),
    borderWidth: z.number().optional().describe('New border width of the shape in px, between 1 and 7.'),
    fontColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{8}$/)
        .optional()
        .describe('New font color of the shape text in 8-digit hex with alpha format. Example: "#000000FF".')
});

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the shape widget. Example: "workspace1234.1606743986126".'),
        widgetId: z.string().describe('Unique identifier of the shape widget to update. Example: "0-1619509853818".'),
        x: z.number().optional().describe('New horizontal position of the shape in px, relative to its parent area or to the mural.'),
        y: z.number().optional().describe('New vertical position of the shape in px, relative to its parent area or to the mural.'),
        width: z.number().optional().describe('New width of the shape in px.'),
        height: z.number().optional().describe('New height of the shape in px.'),
        text: z.string().optional().describe('New plain text content of the shape.'),
        htmlText: z.string().optional().describe('New text content of the shape as HTML. Takes priority over "text" when both are provided.'),
        title: z.string().optional().describe('New title of the shape shown in the mural outline.'),
        hidden: z.boolean().optional().describe('Whether the shape is hidden from non-facilitators when it is in the outline.'),
        instruction: z.string().optional().describe('New facilitator instruction for the shape, as HTML.'),
        parentId: z.string().optional().describe('Identifier of the area widget that should contain the shape.'),
        presentationIndex: z.number().optional().describe('New list order of the shape in the mural outline.'),
        rotation: z.number().min(0).lt(360).optional().describe('New rotation angle of the shape in degrees, from 0 up to (but not including) 360.'),
        style: InputStyleSchema.optional().describe('Style properties to apply to the shape. Only the provided style fields are changed.')
    })
    .describe('Fields to change on an existing shape widget; omitted fields keep their current values.');

const OutputStyleSchema = z.object({
    backgroundColor: z.string().optional().describe('Background color of the shape in 8-digit hex with alpha format.'),
    borderColor: z.string().optional().describe('Border color of the shape in 8-digit hex with alpha format.'),
    borderStyle: z.string().optional().describe('Border style of the shape.'),
    borderWidth: z.number().optional().describe('Border width of the shape in px.'),
    fontColor: z.string().optional().describe('Font color of the shape text in 8-digit hex with alpha format.'),
    bold: z.boolean().optional().describe('Whether the shape text is bold.'),
    italic: z.boolean().optional().describe('Whether the shape text is italic.'),
    underline: z.boolean().optional().describe('Whether the shape text is underlined.'),
    strike: z.boolean().optional().describe('Whether the shape text is struck through.'),
    font: z.string().optional().describe('Font family of the shape text.'),
    fontSize: z.number().optional().describe('Font size of the shape text.'),
    textAlign: z.string().optional().describe('Horizontal alignment of the shape text.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the updated shape widget.'),
        type: z.string().optional().describe('Widget type. Always "shape" for this action.'),
        shape: z.string().optional().describe('Shape type of the widget. Example: "rectangle".'),
        x: z.number().optional().describe('Horizontal position of the shape in px.'),
        y: z.number().optional().describe('Vertical position of the shape in px.'),
        width: z.number().optional().describe('Width of the shape in px.'),
        height: z.number().optional().describe('Height of the shape in px.'),
        rotation: z.number().optional().describe('Rotation angle of the shape in degrees.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the shape.'),
        hidden: z.boolean().optional().describe('Whether the shape is hidden from non-facilitators when in the outline.'),
        invisible: z.boolean().optional().describe('Whether the shape is invisible.'),
        instruction: z.string().optional().describe('Facilitator instruction for the shape, as HTML.'),
        parentId: z
            .string()
            .nullable()
            .optional()
            .describe('Identifier of the area widget that contains the shape, or null when the shape is not inside an area.'),
        presentationIndex: z.number().optional().describe('List order of the shape in the mural outline.'),
        htmlText: z.string().optional().describe('Text content of the shape as HTML.'),
        text: z.string().optional().describe('Plain text content of the shape.'),
        title: z.string().optional().describe('Title of the shape shown in the mural outline.'),
        style: OutputStyleSchema.optional().describe('Style properties of the shape.'),
        contentEditedOn: z.number().optional().describe('Timestamp in milliseconds when the shape content was last edited.'),
        createdOn: z.number().optional().describe('Timestamp in milliseconds when the shape was created.'),
        updatedOn: z.number().optional().describe('Timestamp in milliseconds when the shape was last updated.'),
        viewLink: z.string().optional().describe('Link that opens the mural focused on this shape.')
    })
    .describe('The shape widget after the update.');

const ProviderStyleSchema = z.object({
    backgroundColor: z.string().optional(),
    borderColor: z.string().optional(),
    borderStyle: z.string().optional(),
    borderWidth: z.number().optional(),
    fontColor: z.string().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    font: z.string().optional(),
    fontSize: z.number().optional(),
    textAlign: z.string().optional()
});

const ProviderShapeWidgetSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    shape: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    rotation: z.number().optional(),
    stackingOrder: z.number().optional(),
    hidden: z.boolean().optional(),
    invisible: z.boolean().optional(),
    instruction: z.string().optional(),
    parentId: z.string().nullable().optional(),
    presentationIndex: z.number().optional(),
    htmlText: z.string().optional(),
    text: z.string().optional(),
    title: z.string().optional(),
    style: ProviderStyleSchema.optional(),
    contentEditedOn: z.number().optional(),
    createdOn: z.number().optional(),
    updatedOn: z.number().optional(),
    viewLink: z.string().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderShapeWidgetSchema
});

/**
 * @tags: [write]
 * @tagReason: Mutates an existing shape widget's position, size, text, or style through the provider API.
 * @pitfalls: Only the fields you supply are changed and omitted fields keep their current values; this action updates shape widgets only (other widget types are rejected), and the shape's geometry type itself cannot be changed.
 */
const action = createAction({
    description: "Update an existing shape widget's position, size, text, or style.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.x !== undefined && { x: input.x }),
            ...(input.y !== undefined && { y: input.y }),
            ...(input.width !== undefined && { width: input.width }),
            ...(input.height !== undefined && { height: input.height }),
            ...(input.text !== undefined && { text: input.text }),
            ...(input.htmlText !== undefined && { htmlText: input.htmlText }),
            ...(input.title !== undefined && { title: input.title }),
            ...(input.hidden !== undefined && { hidden: input.hidden }),
            ...(input.instruction !== undefined && { instruction: input.instruction }),
            ...(input.parentId !== undefined && { parentId: input.parentId }),
            ...(input.presentationIndex !== undefined && { presentationIndex: input.presentationIndex }),
            ...(input.rotation !== undefined && { rotation: input.rotation }),
            ...(input.style !== undefined && { style: input.style })
        };

        // https://developers.mural.co/public/reference/updateshapewidget
        const response = await nango.patch({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/shape/${encodeURIComponent(input.widgetId)}`,
            data,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const widget = parsed.value;

        return {
            id: widget.id,
            ...(widget.type !== undefined && { type: widget.type }),
            ...(widget.shape !== undefined && { shape: widget.shape }),
            ...(widget.x !== undefined && { x: widget.x }),
            ...(widget.y !== undefined && { y: widget.y }),
            ...(widget.width !== undefined && { width: widget.width }),
            ...(widget.height !== undefined && { height: widget.height }),
            ...(widget.rotation !== undefined && { rotation: widget.rotation }),
            ...(widget.stackingOrder !== undefined && { stackingOrder: widget.stackingOrder }),
            ...(widget.hidden !== undefined && { hidden: widget.hidden }),
            ...(widget.invisible !== undefined && { invisible: widget.invisible }),
            ...(widget.instruction !== undefined && { instruction: widget.instruction }),
            ...(widget.parentId !== undefined && { parentId: widget.parentId }),
            ...(widget.presentationIndex !== undefined && { presentationIndex: widget.presentationIndex }),
            ...(widget.htmlText !== undefined && { htmlText: widget.htmlText }),
            ...(widget.text !== undefined && { text: widget.text }),
            ...(widget.title !== undefined && { title: widget.title }),
            ...(widget.style !== undefined && { style: widget.style }),
            ...(widget.contentEditedOn !== undefined && { contentEditedOn: widget.contentEditedOn }),
            ...(widget.createdOn !== undefined && { createdOn: widget.createdOn }),
            ...(widget.updatedOn !== undefined && { updatedOn: widget.updatedOn }),
            ...(widget.viewLink !== undefined && { viewLink: widget.viewLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
