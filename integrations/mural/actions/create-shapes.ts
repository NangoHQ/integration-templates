import { z } from 'zod';
import { createAction } from 'nango';

const ColorSchema = z
    .string()
    .regex(/^#[0-9A-Fa-f]{8}$/, 'Color must be an 8-digit hex string in the form "#RRGGBBAA"')
    .describe('Color as an 8-digit hex string including alpha, e.g. "#FFF4CCFF" or "#00000000" for transparent.');

const ShapeStyleInputSchema = z.object({
    backgroundColor: ColorSchema.optional().describe('Fill color of the shape. Use "#00000000" for no fill.'),
    borderColor: ColorSchema.optional().describe('Color of the shape border.'),
    borderStyle: z.enum(['solid', 'dotted']).optional().describe('Line style of the shape border. Defaults to "solid".'),
    borderWidth: z.number().optional().describe('Width of the shape border in pixels. Defaults to 3.'),
    fontColor: ColorSchema.optional().describe('Color of the text inside the shape.')
});

const ShapeInputSchema = z.object({
    shape: z
        .string()
        .describe(
            'Shape type. Common values: "rectangle", "ellipse", "triangle_smart", "rhombus_smart", "hexagon_smart", "pentagon_smart", "star", "cloud", "speech_bubble_center". ' +
                'The legacy values "circle", "diamond", "hexagon", "pentagon", "square" and "triangle" are deprecated in favor of "ellipse", "rhombus_smart", "hexagon_smart", "pentagon_smart", "rectangle" and "triangle_smart".'
        ),
    x: z.number().describe('Horizontal position in pixels, measured from the left of the mural (or of the parent widget when parentId is set).'),
    y: z.number().describe('Vertical position in pixels, measured from the top of the mural (or of the parent widget when parentId is set).'),
    width: z.number().optional().describe('Width of the shape in pixels. Defaults to 168.'),
    height: z.number().optional().describe('Height of the shape in pixels. Defaults to 168.'),
    text: z.string().optional().describe('Text displayed inside the shape. Defaults to an empty string.'),
    title: z.string().optional().describe('Title of the shape shown in the mural outline.'),
    htmlText: z.string().optional().describe('HTML-formatted text content for the shape.'),
    instruction: z.string().optional().describe('Facilitator instruction associated with the shape.'),
    parentId: z
        .string()
        .optional()
        .describe('ID of the parent area widget that should contain this shape, e.g. "0-12345". When set, x and y are relative to the area.'),
    hidden: z.boolean().optional().describe('Whether the shape is hidden from non-facilitators.'),
    rotation: z.number().min(0).lt(360).optional().describe('Rotation of the shape in degrees.'),
    stackingOrder: z.number().optional().describe('Z-index stacking order of the shape.'),
    presentationIndex: z.number().optional().describe('Ordering index of the shape within a presentation.'),
    style: ShapeStyleInputSchema.optional().describe(
        'Visual style of the shape. When omitted the provider applies a transparent fill with a solid black 3px border.'
    )
});

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural on which to create the shapes, e.g. "workspace1234.1606743986126".'),
        shapes: z
            .array(ShapeInputSchema)
            .min(1)
            .max(1000)
            .describe('Shape widgets to create on the mural. Up to 1000 shapes per request; all are created atomically.')
    })
    .describe('Input for creating one or more shape widgets on a mural.');

const WidgetUserSchema = z.object({
    id: z.string().describe('Unique identifier of the user.'),
    firstName: z.string().nullable().optional().describe('First name of the user.'),
    lastName: z.string().nullable().optional().describe('Last name of the user.'),
    email: z.string().nullable().optional().describe('Email address of the user.'),
    type: z.string().nullable().optional().describe('User type, e.g. "member".')
});

const ShapeStyleOutputSchema = z.object({
    backgroundColor: z.string().optional().describe('Fill color as an 8-digit hex string.'),
    borderColor: z.string().optional().describe('Border color as an 8-digit hex string.'),
    borderStyle: z.string().optional().describe('Border line style.'),
    borderWidth: z.number().optional().describe('Border width in pixels.'),
    fontColor: z.string().optional().describe('Text color as an 8-digit hex string.'),
    bold: z.boolean().optional().describe('Whether the text is bold.'),
    font: z.string().optional().describe('Font family of the text.'),
    fontSize: z.number().optional().describe('Font size of the text.'),
    italic: z.boolean().optional().describe('Whether the text is italic.'),
    strike: z.boolean().optional().describe('Whether the text is struck through.'),
    textAlign: z.string().optional().describe('Horizontal text alignment.'),
    underline: z.boolean().optional().describe('Whether the text is underlined.')
});

const ShapeOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the created shape widget.'),
    type: z.string().describe('Widget type; always "shape" for this endpoint.'),
    shape: z.string().describe('Shape type that was created.'),
    x: z.number().describe('Horizontal position of the shape in pixels.'),
    y: z.number().describe('Vertical position of the shape in pixels.'),
    width: z.number().optional().describe('Width of the shape in pixels.'),
    height: z.number().optional().describe('Height of the shape in pixels.'),
    text: z.string().optional().describe('Text displayed inside the shape.'),
    title: z.string().optional().describe('Title of the shape shown in the mural outline.'),
    htmlText: z.string().optional().describe('HTML-formatted text content of the shape.'),
    instruction: z.string().optional().describe('Facilitator instruction associated with the shape.'),
    parentId: z.string().nullable().optional().describe('ID of the parent area widget, or null when the shape is directly on the mural.'),
    hidden: z.boolean().optional().describe('Whether the shape is hidden from non-facilitators.'),
    invisible: z.boolean().optional().describe('Whether the shape is invisible.'),
    locked: z.boolean().optional().describe('Whether the shape is locked.'),
    lockedByFacilitator: z.boolean().optional().describe('Whether the shape is locked by a facilitator.'),
    hideEditor: z.boolean().optional().describe('Whether the editor is hidden for this shape.'),
    hideOwner: z.boolean().optional().describe('Whether the owner is hidden for this shape.'),
    rotation: z.number().optional().describe('Rotation of the shape in degrees.'),
    stackingOrder: z.number().optional().describe('Z-index stacking order of the shape.'),
    presentationIndex: z.number().optional().describe('Ordering index of the shape within a presentation.'),
    viewLink: z.string().optional().describe('Deep link that opens the mural focused on this shape.'),
    createdOn: z.number().optional().describe('Creation timestamp in epoch milliseconds.'),
    updatedOn: z.number().optional().describe('Last update timestamp in epoch milliseconds.'),
    contentEditedOn: z.number().optional().describe('Last content edit timestamp in epoch milliseconds.'),
    createdBy: WidgetUserSchema.optional().describe('User who created the shape.'),
    updatedBy: WidgetUserSchema.optional().describe('User who last updated the shape.'),
    contentEditedBy: WidgetUserSchema.optional().describe('User who last edited the shape content.'),
    style: ShapeStyleOutputSchema.optional().describe('Resolved visual style of the shape.')
});

const ProviderResponseSchema = z.object({
    value: z.array(ShapeOutputSchema)
});

const OutputSchema = z
    .object({
        shapes: z.array(ShapeOutputSchema).describe('The shape widgets that were created, in the same order as the request.')
    })
    .describe('The shape widgets that were created on the mural.');

/**
 * @tags: [write]
 * @tagReason: Creates new shape widgets on a mural through the provider's create-shape endpoint.
 * @pitfalls: Style colors must be 8-digit hex "#RRGGBBAA" (6-digit values are rejected even though the provider docs show them), and style accepts only backgroundColor, borderColor, borderStyle, borderWidth and fontColor. Creation is atomic per request, so one invalid shape rejects the whole batch and creates none; omitted width/height default to 168 and an omitted style defaults to a transparent fill with a solid black 3px border.
 */
const action = createAction({
    description: 'Create one or more shape widgets on a mural canvas.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post<unknown>({
            // https://developers.mural.co/public/reference/createshapewidget
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/shape`,
            data: input.shapes,
            // Creating widgets is not idempotent: a retry after a lost response would create duplicates.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent write must not be retried
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            shapes: parsed.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
