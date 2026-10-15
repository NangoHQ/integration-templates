import { z } from 'zod';
import { createAction } from 'nango';

const TextStyleSchema = z
    .object({
        backgroundColor: z.string().optional().describe('Background color as 8-digit hex with alpha, e.g. "#FFFFFF00" for fully transparent.'),
        font: z
            .enum(['adelle', 'blambot-casual', 'blambot-pro', 'lint-mccree', 'marker-felt', 'museo-slab', 'proxima-nova', 'shark-water'])
            .optional()
            .describe('Font family of the text.'),
        fontSize: z.number().optional().describe('Text size in px. Minimum 1.'),
        textAlign: z.enum(['left', 'center', 'right']).optional().describe('Horizontal alignment of the text.')
    })
    .describe('Text styling: background color, font, size, and alignment.');

const TextBoxInputSchema = z
    .object({
        x: z.number().optional().describe('Horizontal position in px from the left of the mural (or of the parent widget). Defaults to 0.'),
        y: z.number().optional().describe('Vertical position in px from the top of the mural (or of the parent widget). Defaults to 0.'),
        width: z.number().optional().describe('Width in px. Defaults to 296.'),
        height: z.number().optional().describe('Height in px. Defaults to 28.'),
        text: z.string().optional().describe('Text content of the box. Supports inline HTML formatting. Defaults to "This is a textbox...".'),
        title: z.string().optional().describe('Title of the widget in the mural outline. Defaults to an empty string.'),
        style: TextStyleSchema.optional().describe('Visual styling of the text box.'),
        hyperlink: z.string().optional().describe('URL associated with the text box.'),
        hyperlinkTitle: z.string().optional().describe('Label displayed on the hyperlink button.'),
        hidden: z.boolean().optional().describe('If true, the widget is hidden from non-facilitators while it is in the outline. Defaults to false.'),
        instruction: z.string().optional().describe('Facilitator-only instructions for the widget.'),
        parentId: z.string().optional().describe('ID of the area widget that should contain this text box.'),
        presentationIndex: z.number().optional().describe('Position of the widget in the outline. Defaults to -1.'),
        rotation: z.number().optional().describe('Rotation angle in degrees (0 inclusive, 360 exclusive). Defaults to 0.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the widget.')
    })
    .describe('A single text box to create on the mural. Every field is optional; omitted values use the provider defaults.');

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the target mural. Example: "workspace1234.1606743986126".'),
        textBoxes: z.array(TextBoxInputSchema).min(1).max(1000).describe('Text boxes to create in a single request (1 to 1000).')
    })
    .describe('Input for creating one or more text box widgets on a mural.');

const WidgetCollaboratorSchema = z
    .object({
        id: z.string().optional().describe('ID of the collaborator.'),
        firstName: z.string().optional().describe('First name of the collaborator.'),
        lastName: z.string().optional().describe('Last name of the collaborator.'),
        alias: z.string().optional().describe('Alias of the collaborator when they are a one-time visitor rather than a member.')
    })
    .describe('A mural member or one-time visitor recorded on a widget.');

const TextBoxOutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the created text box widget.'),
        type: z.literal('text').describe('Widget type, always "text".'),
        text: z.string().optional().describe('Text content of the widget.'),
        title: z.string().optional().describe('Title of the widget in the mural outline.'),
        x: z.number().optional().describe('Horizontal position in px.'),
        y: z.number().optional().describe('Vertical position in px.'),
        width: z.number().optional().describe('Width in px.'),
        height: z.number().optional().describe('Height in px.'),
        fixedWidth: z.boolean().optional().describe('True when the text wraps to fit the widget, which is the case for text boxes.'),
        style: TextStyleSchema.optional().describe('Visual styling of the widget.'),
        hyperlink: z.string().optional().describe('URL associated with the widget.'),
        hyperlinkTitle: z.string().optional().describe('Label displayed on the hyperlink button.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators while it is in the outline.'),
        instruction: z.string().optional().describe('Facilitator-only instructions for the widget.'),
        parentId: z.string().nullable().optional().describe('ID of the containing area widget, or null when the widget sits directly on the mural.'),
        presentationIndex: z.number().optional().describe('Position of the widget in the outline.'),
        rotation: z.number().optional().describe('Rotation angle in degrees.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the widget.'),
        createdOn: z.number().optional().describe('Creation time as Unix epoch milliseconds.'),
        updatedOn: z.number().optional().describe('Last update time as Unix epoch milliseconds.'),
        contentEditedOn: z.number().optional().describe('Last content edit time as Unix epoch milliseconds.'),
        createdBy: WidgetCollaboratorSchema.optional().describe('Collaborator who created the widget.'),
        updatedBy: WidgetCollaboratorSchema.optional().describe('Collaborator who last updated the widget.'),
        contentEditedBy: WidgetCollaboratorSchema.optional().describe('Collaborator who last edited the widget content.'),
        viewLink: z.string().optional().describe('Link that opens the mural focused on this widget.')
    })
    .describe('A text box widget as returned by the provider.');

const ProviderResponseSchema = z.object({
    value: z.array(TextBoxOutputSchema)
});

const OutputSchema = z
    .object({
        textBoxes: z.array(TextBoxOutputSchema).describe('The text box widgets that were created, in the order they were requested.')
    })
    .describe('The text box widgets created on the mural.');

type TextBoxInput = z.infer<typeof TextBoxInputSchema>;

function buildTextBox(box: TextBoxInput): Record<string, unknown> {
    return {
        ...(box.x !== undefined && { x: box.x }),
        ...(box.y !== undefined && { y: box.y }),
        ...(box.width !== undefined && { width: box.width }),
        ...(box.height !== undefined && { height: box.height }),
        ...(box.text !== undefined && { text: box.text }),
        ...(box.title !== undefined && { title: box.title }),
        ...(box.hyperlink !== undefined && { hyperlink: box.hyperlink }),
        ...(box.hyperlinkTitle !== undefined && { hyperlinkTitle: box.hyperlinkTitle }),
        ...(box.hidden !== undefined && { hidden: box.hidden }),
        ...(box.instruction !== undefined && { instruction: box.instruction }),
        ...(box.parentId !== undefined && { parentId: box.parentId }),
        ...(box.presentationIndex !== undefined && { presentationIndex: box.presentationIndex }),
        ...(box.rotation !== undefined && { rotation: box.rotation }),
        ...(box.stackingOrder !== undefined && { stackingOrder: box.stackingOrder }),
        ...(box.style !== undefined && {
            style: {
                ...(box.style.backgroundColor !== undefined && { backgroundColor: box.style.backgroundColor }),
                ...(box.style.font !== undefined && { font: box.style.font }),
                ...(box.style.fontSize !== undefined && { fontSize: box.style.fontSize }),
                ...(box.style.textAlign !== undefined && { textAlign: box.style.textAlign })
            }
        })
    };
}

/**
 * @tags: [write]
 * @tagReason: Creates new text box widgets on a mural (provider mutation).
 * @pitfalls: No field is required and coordinates are not bounds-checked, so omitted values silently fall back to provider defaults (including placeholder text) and arbitrary x/y positions are accepted without error.
 */
const action = createAction({
    description: 'Create one or more text box widgets on a mural.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = input.textBoxes.map(buildTextBox);

        const response = await nango.post({
            // https://developers.mural.co/public/reference/createtextbox
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/textbox`,
            data: body,
            // Not idempotent: the API has no idempotency key, so a retry after a lost response would create duplicate text boxes. Keep retries at 0.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            textBoxes: parsed.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
