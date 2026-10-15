import { z } from 'zod';
import { createAction } from 'nango';

const StickyNoteStyleSchema = z.object({
    backgroundColor: z
        .string()
        .optional()
        .describe('Background color in 8-digit hex with alpha (e.g. "#FCFE7DFF"). Omitted properties keep their provider defaults.'),
    bold: z.boolean().optional().describe('Whether the text is bold.'),
    border: z.boolean().optional().describe('Whether a black border is drawn around the sticky note.'),
    italic: z.boolean().optional().describe('Whether the text is italic.'),
    underline: z.boolean().optional().describe('Whether the text is underlined.'),
    strike: z.boolean().optional().describe('Whether the text is struck through.'),
    font: z
        .enum(['adelle', 'blambot-casual', 'blambot-pro', 'lint-mccree', 'marker-felt', 'museo-slab', 'proxima-nova', 'shark-water'])
        .optional()
        .describe('Font family of the text.'),
    fontSize: z.number().optional().describe('Text size in points.'),
    textAlign: z.enum(['left', 'center', 'right']).optional().describe('Horizontal text alignment.')
});

const StickyNoteInputSchema = z.object({
    x: z.number().describe('Horizontal position in px, measured from the left of the mural (or of the parent area).'),
    y: z.number().describe('Vertical position in px, measured from the top of the mural (or of the parent area).'),
    shape: z.enum(['circle', 'rectangle']).describe('Shape of the sticky note. Required by the provider.'),
    title: z.string().optional().describe('Title shown in the mural outline. Defaults to an empty string when omitted.'),
    text: z.string().optional().describe('Plain text content of the sticky note.'),
    htmlText: z.string().optional().describe('HTML-formatted content; takes priority over "text" when set.'),
    width: z.number().optional().describe('Width in px; the provider applies its own default when omitted.'),
    height: z.number().optional().describe('Height in px; the provider applies its own default when omitted.'),
    style: StickyNoteStyleSchema.optional().describe('Visual style overrides; unspecified properties keep their provider defaults.'),
    hidden: z.boolean().optional().describe('Whether the sticky note is hidden from non-facilitators. Default: false.'),
    instruction: z.string().optional().describe('Facilitator-only instructions attached to the sticky note.'),
    parentId: z.string().optional().describe('ID of the area widget that should contain this sticky note.'),
    presentationIndex: z.number().optional().describe('Order of the sticky note in the outline. Default: -1.'),
    rotation: z.number().optional().describe('Rotation angle in degrees (0 to less than 360). Default: 0.'),
    stackingOrder: z.number().optional().describe('Z-index stacking order of the sticky note.'),
    tags: z.array(z.string()).optional().describe('IDs of tags to apply to the sticky note.'),
    hyperlink: z.string().optional().describe('URL to attach to the sticky note.'),
    hyperlinkTitle: z.string().optional().describe('Label displayed on the attached hyperlink.')
});

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to add sticky notes to (e.g. "workspace1234.1606743986126").'),
        stickyNotes: z.array(StickyNoteInputSchema).min(1).max(1000).describe('Sticky notes to create; the provider accepts up to 1000 per call.')
    })
    .describe('Input for creating one or more sticky notes on a mural.');

const CollaboratorSchema = z.object({
    id: z.string().optional().describe('Unique ID of the collaborator.'),
    firstName: z.string().optional().describe('First name of the collaborator.'),
    lastName: z.string().optional().describe('Last name of the collaborator.'),
    alias: z.string().optional().describe('Alias of a one-time visitor collaborator.')
});

const StickyNoteWidgetSchema = z.object({
    id: z.string().describe('Unique ID of the created sticky note widget.'),
    type: z.string().optional().describe('Widget type; always "sticky note".'),
    shape: z.string().optional().describe('Shape of the sticky note ("circle" or "rectangle").'),
    title: z.string().optional().describe('Title of the sticky note in the mural outline.'),
    text: z.string().optional().describe('Plain text content of the sticky note.'),
    htmlText: z.string().optional().describe('HTML-formatted content, when set.'),
    x: z.number().optional().describe('Horizontal position in px.'),
    y: z.number().optional().describe('Vertical position in px.'),
    width: z.number().optional().describe('Width in px.'),
    height: z.number().optional().describe('Height in px.'),
    minLines: z.number().optional().describe('Minimum number of text lines the provider computed for the sticky note.'),
    rotation: z.number().optional().describe('Rotation angle in degrees.'),
    stackingOrder: z.number().optional().describe('Z-index stacking order of the sticky note.'),
    hidden: z.boolean().optional().describe('Whether the sticky note is hidden from non-facilitators.'),
    hideEditor: z.boolean().optional().describe('Whether the last editor is hidden (private mode).'),
    hideOwner: z.boolean().optional().describe('Whether the creator is hidden (private mode).'),
    invisible: z.boolean().optional().describe('Whether the sticky note is invisible.'),
    locked: z.boolean().optional().describe('Whether the sticky note is locked.'),
    lockedByFacilitator: z.boolean().optional().describe('Whether the sticky note is locked by a facilitator.'),
    parentId: z.string().nullable().optional().describe('ID of the containing area widget, or null when the sticky note has no parent.'),
    presentationIndex: z.number().optional().describe('Order of the sticky note in the outline.'),
    instruction: z.string().optional().describe('Facilitator-only instructions attached to the sticky note.'),
    hyperlink: z.string().optional().describe('URL attached to the sticky note.'),
    hyperlinkTitle: z.string().optional().describe('Label of the attached hyperlink.'),
    tags: z.array(z.string()).optional().describe('IDs of tags applied to the sticky note.'),
    style: StickyNoteStyleSchema.optional().describe('Resolved style of the sticky note, including provider defaults.'),
    viewLink: z.string().optional().describe('URL that opens the mural focused on this sticky note.'),
    createdOn: z.number().optional().describe('Creation time in epoch milliseconds.'),
    updatedOn: z.number().optional().describe('Last update time in epoch milliseconds.'),
    contentEditedOn: z.number().optional().describe('Last content edit time in epoch milliseconds.'),
    createdBy: CollaboratorSchema.optional().describe('Collaborator who created the sticky note.'),
    updatedBy: CollaboratorSchema.optional().describe('Collaborator who last updated the sticky note.'),
    contentEditedBy: CollaboratorSchema.optional().describe('Collaborator who last edited the sticky note content.')
});

const OutputSchema = z
    .object({
        stickyNotes: z.array(StickyNoteWidgetSchema).describe('The sticky notes that were created, in the same order as the request.')
    })
    .describe('The sticky notes created on the mural.');

/**
 * @tags: [write]
 * @tagReason: Creates new sticky note widgets on a mural, which is a provider mutation.
 * @pitfalls: The returned widget id is only unique within its mural (duplicating a mural reuses the same widget IDs), so use the mural id together with the widget id as a key.
 */
const action = createAction({
    description: "Create one or more sticky notes on a mural's canvas. Requires x/y position and a shape; everything else has sensible defaults.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = input.stickyNotes.map((note) => ({
            x: note.x,
            y: note.y,
            shape: note.shape,
            ...(note.title !== undefined && { title: note.title }),
            ...(note.text !== undefined && { text: note.text }),
            ...(note.htmlText !== undefined && { htmlText: note.htmlText }),
            ...(note.width !== undefined && { width: note.width }),
            ...(note.height !== undefined && { height: note.height }),
            ...(note.style !== undefined && { style: note.style }),
            ...(note.hidden !== undefined && { hidden: note.hidden }),
            ...(note.instruction !== undefined && { instruction: note.instruction }),
            ...(note.parentId !== undefined && { parentId: note.parentId }),
            ...(note.presentationIndex !== undefined && { presentationIndex: note.presentationIndex }),
            ...(note.rotation !== undefined && { rotation: note.rotation }),
            ...(note.stackingOrder !== undefined && { stackingOrder: note.stackingOrder }),
            ...(note.tags !== undefined && { tags: note.tags }),
            ...(note.hyperlink !== undefined && { hyperlink: note.hyperlink }),
            ...(note.hyperlinkTitle !== undefined && { hyperlinkTitle: note.hyperlinkTitle })
        }));

        const response = await nango.post({
            // https://developers.mural.co/public/reference/createstickynote
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/sticky-note`,
            data: body,
            // POST creates new widgets and has no idempotency key, so keep retries at the minimum this repo's lint allows (0 is rejected) to avoid duplicate sticky notes after a lost response.
            retries: 1
        });

        const parsed = z.object({ value: z.array(StickyNoteWidgetSchema) }).parse(response.data);

        return {
            stickyNotes: parsed.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
