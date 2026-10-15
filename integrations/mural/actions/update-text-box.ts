import { z } from 'zod';
import { createAction } from 'nango';

const TextStyleSchema = z.object({
    backgroundColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{8}$/)
        .optional()
        .describe('Background color as an 8-digit hex value with alpha. Example: "#FFFFFF00" for transparent.'),
    font: z
        .enum(['adelle', 'blambot-casual', 'blambot-pro', 'lint-mccree', 'marker-felt', 'museo-slab', 'proxima-nova', 'shark-water'])
        .optional()
        .describe('Font family of the text.'),
    fontSize: z.number().min(1).optional().describe('Text size in points.'),
    textAlign: z.enum(['left', 'center', 'right']).optional().describe('Horizontal alignment of the text.')
});

const InputSchema = z
    .object({
        muralId: z.string().describe('ID of the mural that contains the text widget. Example: "workspace1234.1606743986126".'),
        widgetId: z.string().describe('ID of the text widget to update. Example: "e386538f-f7e2-4f85-b846-9ceb3224276d".'),
        text: z.string().optional().describe('New text content of the widget.'),
        x: z.number().optional().describe('New horizontal position of the widget in px, measured from the left of its parent widget or the mural.'),
        y: z.number().optional().describe('New vertical position of the widget in px, measured from the top of its parent widget or the mural.'),
        width: z.number().optional().describe('New width of the widget in px.'),
        height: z.number().optional().describe('New height of the widget in px.'),
        title: z.string().optional().describe('New title of the widget shown in the mural outline.'),
        rotation: z.number().min(0).lt(360).optional().describe('New rotation of the widget in degrees (0 inclusive, 360 exclusive).'),
        hidden: z.boolean().optional().describe('When true, the widget is hidden from non-facilitators in the outline.'),
        parentId: z.string().optional().describe('ID of the area widget that should contain this widget.'),
        presentationIndex: z.number().optional().describe('New position of the widget in the mural outline.'),
        instruction: z.string().optional().describe('New facilitator instruction text for the widget in the outline.'),
        hyperlink: z.string().max(1024).optional().describe('URL to attach to the widget as a hyperlink.'),
        hyperlinkTitle: z.string().optional().describe('Label shown on the widget hyperlink button.'),
        style: TextStyleSchema.optional().describe('Style properties to merge into the widget; omitted properties keep their current values.')
    })
    .describe('Fields to update on an existing text widget; provide at least one field to change.');

const CollaboratorSchema = z.object({
    id: z.string().optional().describe('ID of the collaborator.'),
    firstName: z.string().optional().describe('First name of the collaborator.'),
    lastName: z.string().optional().describe('Last name of the collaborator.'),
    alias: z.string().optional().describe('Alias of a one-time visitor.'),
    type: z.string().optional().describe('Type of the collaborator. Example: "member".')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the updated widget.'),
        type: z.literal('text').describe('Type of the widget; always "text".'),
        text: z.string().optional().describe('Text content of the widget.'),
        title: z.string().optional().describe('Title of the widget shown in the mural outline.'),
        x: z.number().describe('Horizontal position of the widget in px.'),
        y: z.number().describe('Vertical position of the widget in px.'),
        width: z.number().describe('Width of the widget in px.'),
        height: z.number().optional().describe('Height of the widget in px.'),
        rotation: z.number().optional().describe('Rotation of the widget in degrees.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the widget.'),
        presentationIndex: z.number().optional().describe('Position of the widget in the mural outline.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators in the outline.'),
        invisible: z.boolean().optional().describe('Whether the widget is invisible.'),
        locked: z.boolean().optional().describe('Whether the widget is locked and cannot be updated by a non-facilitator.'),
        lockedByFacilitator: z.boolean().optional().describe('Whether the widget is locked by a facilitator.'),
        hideEditor: z.boolean().optional().describe('Whether the name of the last editor is hidden because Private Mode is enabled.'),
        hideOwner: z.boolean().optional().describe('Whether the name of the creator is hidden because Private Mode is enabled.'),
        fixedWidth: z.boolean().optional().describe('When true the text wraps to fit the widget; when false the widget grows to fit the text.'),
        parentId: z.string().nullable().optional().describe('ID of the area widget that contains this widget, or null when it has no parent.'),
        instruction: z.string().optional().describe('Facilitator instruction text for the widget in the outline.'),
        hyperlink: z.string().optional().describe('URL attached to the widget.'),
        hyperlinkTitle: z.string().optional().describe('Label shown on the widget hyperlink button.'),
        style: TextStyleSchema.optional().describe('Style properties of the widget.'),
        contentEditedOn: z.number().optional().describe('Unix epoch-milliseconds timestamp of the last content edit.'),
        createdOn: z.number().optional().describe('Unix epoch-milliseconds timestamp when the widget was created.'),
        updatedOn: z.number().optional().describe('Unix epoch-milliseconds timestamp of the last widget update.'),
        viewLink: z.string().optional().describe('Link that opens the mural focused on this widget.'),
        createdBy: CollaboratorSchema.optional().describe('Collaborator who created the widget.'),
        updatedBy: CollaboratorSchema.optional().describe('Collaborator who last updated the widget.'),
        contentEditedBy: CollaboratorSchema.optional().describe('Collaborator who last edited the widget content.')
    })
    .describe('The updated text widget, including its text, position, size, style, and metadata.');

/**
 * @tags: [write]
 * @tagReason: Updates the text, position, size, and style of an existing text widget on a mural through the provider API.
 * @pitfalls: The `style` object is merged into the widget's existing style, so omitted style properties keep their current values; calling with no updatable fields still succeeds but bumps `updatedOn` and `contentEditedOn`.
 */
const action = createAction({
    description: 'Update an existing text widget on a mural.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.text !== undefined && { text: input.text }),
            ...(input.x !== undefined && { x: input.x }),
            ...(input.y !== undefined && { y: input.y }),
            ...(input.width !== undefined && { width: input.width }),
            ...(input.height !== undefined && { height: input.height }),
            ...(input.title !== undefined && { title: input.title }),
            ...(input.rotation !== undefined && { rotation: input.rotation }),
            ...(input.hidden !== undefined && { hidden: input.hidden }),
            ...(input.parentId !== undefined && { parentId: input.parentId }),
            ...(input.presentationIndex !== undefined && { presentationIndex: input.presentationIndex }),
            ...(input.instruction !== undefined && { instruction: input.instruction }),
            ...(input.hyperlink !== undefined && { hyperlink: input.hyperlink }),
            ...(input.hyperlinkTitle !== undefined && { hyperlinkTitle: input.hyperlinkTitle }),
            ...(input.style !== undefined && {
                style: {
                    ...(input.style.backgroundColor !== undefined && { backgroundColor: input.style.backgroundColor }),
                    ...(input.style.font !== undefined && { font: input.style.font }),
                    ...(input.style.fontSize !== undefined && { fontSize: input.style.fontSize }),
                    ...(input.style.textAlign !== undefined && { textAlign: input.style.textAlign })
                }
            })
        };

        const response = await nango.patch({
            // https://developers.mural.co/public/reference/updatetextbox
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/textbox/${encodeURIComponent(input.widgetId)}`,
            data,
            // Idempotent PATCH: fields are absolute values, so a retried request cannot duplicate the change.
            retries: 3
        });

        const parsed = z.object({ value: OutputSchema }).parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
