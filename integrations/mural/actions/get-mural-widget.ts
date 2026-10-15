import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('The unique ID of the mural that contains the widget. Example: "nangodev4776.1791984276717".'),
        widgetId: z.string().describe('The unique ID of the widget to retrieve. Example: "7a3069f3-95d8-4910-b09c-2f66b1af9dbb".')
    })
    .describe('Identifies the widget to retrieve and the mural that owns it.');

const WidgetCollaboratorSchema = z
    .object({
        id: z.string().optional().describe('Unique ID of the collaborator (a workspace member or a one-time visitor).'),
        firstName: z.string().optional().describe('First name of the workspace member.'),
        lastName: z.string().optional().describe('Last name of the workspace member.'),
        alias: z.string().optional().describe('Alias of the one-time visitor.')
    })
    .passthrough();

const WidgetStyleSchema = z
    .object({
        backgroundColor: z.string().optional().describe('Background color in 8-digit hex with alpha. Example: "#FCFE7DFF".'),
        border: z.boolean().optional().describe('Whether a black border is displayed around the widget.'),
        borderColor: z.string().optional().describe('Border color in 8-digit hex with alpha.'),
        borderStyle: z.string().optional().describe('Border style. Example: "solid".'),
        borderWidth: z.number().optional().describe('Border width in px.'),
        bold: z.boolean().optional().describe('Whether the text is bold.'),
        italic: z.boolean().optional().describe('Whether the text is italic.'),
        underline: z.boolean().optional().describe('Whether the text is underlined.'),
        strike: z.boolean().optional().describe('Whether the text is struck through.'),
        font: z.string().optional().describe('Font family of the text. Example: "proxima-nova".'),
        fontColor: z.string().optional().describe('Font color in 8-digit hex with alpha.'),
        fontSize: z.number().optional().describe('Font size in px.'),
        textAlign: z.string().optional().describe('Text alignment. Example: "center".'),
        titleFontSize: z.number().optional().describe('Font size of an area widget title.'),
        strokeColor: z.string().optional().describe('Stroke color of an arrow widget in 8-digit hex with alpha.'),
        strokeStyle: z.string().optional().describe('Stroke style of an arrow widget. Example: "solid".'),
        strokeWidth: z.number().optional().describe('Stroke width of an arrow widget in px.'),
        color: z.string().optional().describe('Color of an icon widget in 8-digit hex with alpha.')
    })
    .passthrough();

const WidgetPointSchema = z
    .object({
        x: z.number().optional().describe('Horizontal coordinate of the point in px.'),
        y: z.number().optional().describe('Vertical coordinate of the point in px.')
    })
    .passthrough();

const WidgetLabelItemSchema = z
    .object({
        x: z.number().optional().describe('Horizontal position of the label in px.'),
        y: z.number().optional().describe('Vertical position of the label in px.'),
        height: z.number().optional().describe('Height of the label in px.'),
        width: z.number().optional().describe('Width of the label in px.'),
        text: z.string().optional().describe('Text of the label.')
    })
    .passthrough();

const WidgetLabelFormatSchema = z
    .object({
        color: z.string().optional().describe('Color of the label text in 8-digit hex with alpha.'),
        fontFamily: z.string().optional().describe('Font family of the label text.'),
        bold: z.boolean().optional().describe('Whether the label text is bold.'),
        italic: z.boolean().optional().describe('Whether the label text is italic.'),
        textAlign: z.string().optional().describe('Alignment of the label text. Example: "center".'),
        fontSize: z.number().optional().describe('Font size of the label text in px.')
    })
    .passthrough();

const WidgetLabelSchema = z
    .object({
        format: WidgetLabelFormatSchema.optional().describe('Formatting of the connector label.'),
        labels: z.array(WidgetLabelItemSchema).optional().describe('Labels placed on the connector.')
    })
    .passthrough();

const WidgetReplySchema = z
    .object({
        created: z.number().optional().describe('Epoch milliseconds when the reply was created.'),
        message: z.string().optional().describe('Text of the reply.'),
        user: WidgetCollaboratorSchema.optional().describe('Collaborator who created the reply.')
    })
    .passthrough();

const WidgetMaskSchema = z
    .object({
        top: z.number().optional().describe('Vertical offset of the cropping mask from the upper-left corner of the image.'),
        left: z.number().optional().describe('Horizontal offset of the cropping mask from the upper-left corner of the image.'),
        height: z.number().optional().describe('Height of the cropping mask.'),
        width: z.number().optional().describe('Width of the cropping mask.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the widget.'),
        type: z.string().describe('Type of the widget. Example: "sticky note".'),
        width: z.number().describe('Width of the widget in px.'),
        height: z.number().optional().describe('Height of the widget in px.'),
        x: z.number().describe('Horizontal position of the widget in px.'),
        y: z.number().describe('Vertical position of the widget in px.'),
        invisible: z.boolean().optional().describe('Whether the widget is invisible.'),
        contentEditedOn: z.number().optional().describe('Epoch milliseconds when the widget content was last edited.'),
        contentEditedBy: WidgetCollaboratorSchema.optional().describe('Collaborator who last edited the widget content.'),
        createdOn: z.number().describe('Epoch milliseconds when the widget was created.'),
        createdBy: WidgetCollaboratorSchema.describe('Collaborator who created the widget.'),
        updatedOn: z.number().optional().describe('Epoch milliseconds when the widget was last updated.'),
        updatedBy: WidgetCollaboratorSchema.optional().describe('Collaborator who last updated the widget.'),
        rotation: z.number().describe('Rotation angle of the widget in degrees.'),
        stackingOrder: z.number().describe('Z-index stacking order of the widget.'),
        hidden: z.boolean().describe('Whether the widget is hidden from non-facilitators.'),
        hideEditor: z.boolean().describe('Whether the name of the last editor is hidden because Private Mode is enabled.'),
        hideOwner: z.boolean().describe('Whether the name of the creator is hidden because Private Mode is enabled.'),
        instruction: z.string().optional().describe('Instruction text for a section of the outline.'),
        locked: z.boolean().describe('Whether the widget is locked.'),
        lockedByFacilitator: z.boolean().describe('Whether the widget is locked by a facilitator.'),
        parentId: z.string().nullable().optional().describe('ID of the parent area widget, or null when the widget has no parent.'),
        presentationIndex: z.number().optional().describe('List order of the widget in the outline.'),
        viewLink: z.string().describe('Link that opens the mural at the widget.'),
        title: z.string().optional().describe('Title of the widget in the outline.'),
        text: z.string().optional().describe('Plain text content of the widget.'),
        htmlText: z.string().optional().describe('HTML-formatted text content of the widget.'),
        shape: z.string().optional().describe('Shape of a sticky note or shape widget. Example: "rectangle".'),
        minLines: z.number().optional().describe('Minimum number of lines in a sticky note widget.'),
        hyperlink: z.string().optional().describe('URL used in the widget.'),
        hyperlinkTitle: z.string().optional().describe('Text displayed on the hyperlink button.'),
        fixedWidth: z.boolean().optional().describe('Whether text wraps to fit the widget instead of the widget growing to fit the text.'),
        style: WidgetStyleSchema.optional().describe('Type-specific style properties of the widget.'),
        tags: z.array(z.string()).optional().describe('IDs of the tags applied to the widget.'),
        layout: z.string().optional().describe('Layout of an area widget. Example: "free".'),
        showTitle: z.boolean().optional().describe('Whether an area widget title is displayed.'),
        arrowType: z.string().optional().describe('Type of the arrow line of an arrow widget. Example: "straight".'),
        tip: z.string().optional().describe('Type of the arrow tip of an arrow widget. Example: "single".'),
        stackable: z.boolean().optional().describe('Whether the arrow widget is stackable.'),
        points: z.array(WidgetPointSchema).optional().describe('Coordinates of the points that make up an arrow widget.'),
        startRefId: z.string().optional().describe('ID of the widget the arrow start point connects to.'),
        endRefId: z.string().optional().describe('ID of the widget the arrow end point connects to.'),
        label: WidgetLabelSchema.optional().describe('Label of an arrow widget.'),
        message: z.string().optional().describe('Message text of a comment widget.'),
        replies: z.array(WidgetReplySchema).optional().describe('Replies to a comment widget.'),
        timestamp: z.number().optional().describe('Epoch milliseconds when the comment was created.'),
        referenceWidgetId: z.string().optional().describe('ID of the widget a comment points to.'),
        resolvedBy: WidgetCollaboratorSchema.optional().describe('Collaborator who resolved the comment.'),
        resolvedOn: z.number().optional().describe('Epoch milliseconds when the comment was resolved.'),
        expiresInMinutes: z
            .number()
            .nullable()
            .optional()
            .describe('Minutes after which a file or image URL expires, or null when download restriction is enabled.'),
        link: z.string().nullable().optional().describe('Link to the file or image widget, or null when absent.'),
        url: z.string().nullable().optional().describe('Download URL of the file or image, or null when download restriction is enabled.'),
        scanning: z.boolean().optional().describe('Whether the file was scanned by antivirus.'),
        previewUrl: z.string().optional().describe('URL of the file preview.'),
        name: z.string().optional().describe('Name of an icon widget.'),
        aspectRatio: z.number().optional().describe('Aspect ratio of an image widget.'),
        border: z.boolean().optional().describe('Whether a border is displayed around an image widget.'),
        caption: z.string().optional().describe('Caption of an image widget.'),
        description: z.string().optional().describe('Description of an image widget.'),
        mask: WidgetMaskSchema.optional().describe('Cropping mask of an image widget.'),
        naturalHeight: z.number().optional().describe('Uncropped height of an image widget in px.'),
        naturalWidth: z.number().optional().describe('Uncropped width of an image widget in px.'),
        showCaption: z.boolean().optional().describe('Whether the image caption and description are visible.'),
        thumbnailUrl: z.string().optional().describe('URL of an image thumbnail.')
    })
    .passthrough()
    .describe('A single Mural widget.');

function getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return undefined;
    }
    const status = response.status;
    return typeof status === 'number' ? status : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads a single widget from a Mural without modifying provider state.
 * @pitfalls: Widget IDs are not globally unique: duplicating a mural copies its widgets' IDs into the new mural, so pass the muralId that actually owns the widget, as a mismatched muralId returns a 404 even for an ID that exists in another mural.
 */
const action = createAction({
    description: 'Retrieve a single widget by ID.',
    version: '1.0.0',
    scopes: ['murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - translate the documented 404 (WIDGET_NOT_FOUND / MURAL_NOT_FOUND) into a typed ActionError.
        try {
            const response = await nango.get<{ value: unknown }>({
                // https://developers.mural.co/public/reference/getmuralwidget
                endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets/${encodeURIComponent(input.widgetId)}`,
                retries: 3
            });

            return OutputSchema.parse(response.data.value);
        } catch (error) {
            if (getErrorStatus(error) === 404) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Widget "${input.widgetId}" was not found in mural "${input.muralId}".`,
                    muralId: input.muralId,
                    widgetId: input.widgetId
                });
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
