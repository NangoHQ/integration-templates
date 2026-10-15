import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const TextFontSchema = z.enum(['adelle', 'blambot-casual', 'blambot-pro', 'lint-mccree', 'marker-felt', 'museo-slab', 'proxima-nova', 'shark-water']);

const StickyNoteStyleInputSchema = z
    .object({
        backgroundColor: z.string().optional().describe('Background color as 8-digit hex with alpha. Example: "#FCFE7DFF".'),
        bold: z.boolean().optional().describe('Whether the text is bold.'),
        border: z.boolean().optional().describe('Whether a black border is drawn around the sticky note.'),
        font: TextFontSchema.optional().describe('Font family used for the text.'),
        fontSize: z.number().optional().describe('Text size.'),
        italic: z.boolean().optional().describe('Whether the text is italic.'),
        strike: z.boolean().optional().describe('Whether the text is struck through.'),
        textAlign: z.enum(['left', 'center', 'right']).optional().describe('Horizontal alignment of the text.'),
        underline: z.boolean().optional().describe('Whether the text is underlined.')
    })
    .describe('Visual style properties to apply to the sticky note.');

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural that contains the sticky note. Example: "nangodev4776.1791984276717".'),
        widgetId: z.string().describe('Unique identifier of the sticky note widget to update. Example: "9a82892e-a71b-496c-820d-5a767522b32b".'),
        text: z.string().optional().describe('Plain-text content of the sticky note.'),
        htmlText: z.string().optional().describe('HTML-formatted content of the sticky note. When set, it takes priority over text.'),
        title: z.string().optional().describe('Title of the sticky note shown in the mural outline.'),
        x: z.number().optional().describe('Horizontal position in px from the left of the mural or its parent area.'),
        y: z.number().optional().describe('Vertical position in px from the top of the mural or its parent area.'),
        width: z.number().optional().describe('Width of the sticky note in px.'),
        height: z.number().optional().describe('Height of the sticky note in px.'),
        rotation: z.number().min(0).lt(360).optional().describe('Rotation angle of the sticky note in degrees, from 0 up to but not including 360.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators in the outline.'),
        hyperlink: z.string().optional().describe('URL attached to the sticky note.'),
        hyperlinkTitle: z.string().optional().describe('Text displayed on the hyperlink button.'),
        instruction: z.string().optional().describe('Facilitator-only instructions for the widget.'),
        parentId: z.string().optional().describe('ID of the area widget that contains this sticky note.'),
        presentationIndex: z.number().optional().describe('Order of the widget in the mural outline.'),
        tags: z.array(z.string()).optional().describe('IDs of the tags to associate with the sticky note.'),
        style: StickyNoteStyleInputSchema.optional().describe('Visual style properties to apply to the sticky note.')
    })
    .describe('Identifies the sticky note to update and the fields to change.');

const CollaboratorSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the collaborator.'),
        firstName: z.string().optional().describe('First name of the collaborator.'),
        lastName: z.string().optional().describe('Last name of the collaborator.'),
        alias: z.string().optional().describe('Alias of a one-time visitor.')
    })
    .describe('The collaborator who created, updated, or edited the widget.');

const StickyNoteStyleSchema = z
    .object({
        backgroundColor: z.string().optional().describe('Background color as 8-digit hex with alpha.'),
        bold: z.boolean().optional().describe('Whether the text is bold.'),
        border: z.boolean().optional().describe('Whether a black border is drawn around the sticky note.'),
        font: z.string().optional().describe('Font family used for the text.'),
        fontSize: z.number().optional().describe('Text size.'),
        italic: z.boolean().optional().describe('Whether the text is italic.'),
        strike: z.boolean().optional().describe('Whether the text is struck through.'),
        textAlign: z.string().optional().describe('Horizontal alignment of the text.'),
        underline: z.boolean().optional().describe('Whether the text is underlined.')
    })
    .describe('Visual style properties of the sticky note.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the sticky note widget.'),
        type: z.string().optional().describe('Type of the widget. Always "sticky note".'),
        shape: z.string().optional().describe('Shape of the sticky note. Example: "rectangle".'),
        title: z.string().optional().describe('Title of the sticky note shown in the mural outline.'),
        text: z.string().optional().describe('Plain-text content of the sticky note.'),
        htmlText: z.string().optional().describe('HTML-formatted content of the sticky note, when present.'),
        x: z.number().optional().describe('Horizontal position in px from the left of the mural or its parent area.'),
        y: z.number().optional().describe('Vertical position in px from the top of the mural or its parent area.'),
        width: z.number().optional().describe('Width of the sticky note in px.'),
        height: z.number().optional().describe('Height of the sticky note in px.'),
        rotation: z.number().optional().describe('Rotation angle of the sticky note in degrees.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the widget.'),
        invisible: z.boolean().optional().describe('Whether the widget is invisible.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators in the outline.'),
        hideEditor: z.boolean().optional().describe('Whether the identity of the last editor is hidden by Private Mode.'),
        hideOwner: z.boolean().optional().describe('Whether the identity of the creator is hidden by Private Mode.'),
        locked: z.boolean().optional().describe('Whether the widget is locked against updates by non-facilitators.'),
        lockedByFacilitator: z.boolean().optional().describe('Whether the widget is locked by a facilitator.'),
        instruction: z.string().optional().describe('Facilitator-only instructions for the widget.'),
        parentId: z.string().nullable().optional().describe('ID of the area widget that contains this sticky note, or null when it is not inside an area.'),
        presentationIndex: z.number().optional().describe('Order of the widget in the mural outline.'),
        minLines: z.number().optional().describe('Minimum number of lines in the sticky note.'),
        hyperlink: z.string().optional().describe('URL attached to the sticky note.'),
        hyperlinkTitle: z.string().optional().describe('Text displayed on the hyperlink button.'),
        tags: z.array(z.string()).optional().describe('IDs of the tags associated with the sticky note.'),
        style: StickyNoteStyleSchema.optional().describe('Visual style properties of the sticky note.'),
        viewLink: z.string().optional().describe('URL that opens the mural focused on this widget.'),
        createdOn: z.number().optional().describe('Creation time as Unix epoch milliseconds.'),
        createdBy: CollaboratorSchema.optional().describe('The collaborator who created the widget.'),
        updatedOn: z.number().optional().describe('Last update time as Unix epoch milliseconds.'),
        updatedBy: CollaboratorSchema.optional().describe('The collaborator who last updated the widget.'),
        contentEditedOn: z.number().optional().describe('Last content-edit time as Unix epoch milliseconds. May lag behind a text-only edit.'),
        contentEditedBy: CollaboratorSchema.optional().describe('The collaborator who last edited the widget content.')
    })
    .describe('The updated sticky note widget.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing sticky note widget's text, position, size, or style through the provider's PATCH endpoint.
 * @pitfalls: The sticky note's shape cannot be changed; htmlText overrides text when both are supplied; contentEditedOn may not reflect a text-only edit in the immediate response and can lag until a later read.
 */
const action = createAction({
    description: 'Update an existing sticky note in a mural.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data = {
            ...(input.text !== undefined && { text: input.text }),
            ...(input.htmlText !== undefined && { htmlText: input.htmlText }),
            ...(input.title !== undefined && { title: input.title }),
            ...(input.x !== undefined && { x: input.x }),
            ...(input.y !== undefined && { y: input.y }),
            ...(input.width !== undefined && { width: input.width }),
            ...(input.height !== undefined && { height: input.height }),
            ...(input.rotation !== undefined && { rotation: input.rotation }),
            ...(input.hidden !== undefined && { hidden: input.hidden }),
            ...(input.hyperlink !== undefined && { hyperlink: input.hyperlink }),
            ...(input.hyperlinkTitle !== undefined && { hyperlinkTitle: input.hyperlinkTitle }),
            ...(input.instruction !== undefined && { instruction: input.instruction }),
            ...(input.parentId !== undefined && { parentId: input.parentId }),
            ...(input.presentationIndex !== undefined && { presentationIndex: input.presentationIndex }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.style !== undefined && { style: input.style })
        };

        const config: ProxyConfiguration = {
            // https://developers.mural.co/public/reference/updatestickynote
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/sticky-note/${encodeURIComponent(input.widgetId)}`,
            data,
            // PATCH sets absolute field values, so replaying it after a lost response yields the same state.
            retries: 3
        };

        const response = await nango.patch(config);

        const parsed = OutputSchema.safeParse(response.data?.value);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Mural returned an unexpected response while updating the sticky note.'
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
