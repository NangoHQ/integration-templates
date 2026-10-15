import { z } from 'zod';
import { createAction } from 'nango';

const WidgetMemberSchema = z.object({
    id: z.string().describe('Unique ID of the collaborator.'),
    firstName: z.string().optional().describe("Collaborator's first name."),
    lastName: z.string().optional().describe("Collaborator's last name."),
    email: z.string().optional().describe("Collaborator's email address."),
    type: z.string().optional().describe('Collaborator kind, for example "member" or "visitor".')
});

const WidgetSchema = z
    .object({
        id: z.string().describe('Unique ID of the widget within its mural.'),
        type: z.string().describe('Widget type, for example "sticky note", "text", "shape", "image", "file", "icon", "comment", "arrow" or "area".'),
        x: z.number().optional().describe('Horizontal position in px, relative to the parent widget or to the mural when there is no parent.'),
        y: z.number().optional().describe('Vertical position in px, relative to the parent widget or to the mural when there is no parent.'),
        width: z.number().optional().describe('Width of the widget in px.'),
        height: z.number().optional().describe('Height of the widget in px.'),
        title: z.string().optional().describe('Title of the widget in the mural outline.'),
        text: z.string().optional().describe('Plain-text content of the widget.'),
        parentId: z.string().nullable().optional().describe('ID of the area widget that contains this widget, or null when the widget sits at the mural root.'),
        createdOn: z.number().optional().describe('Creation time as a Unix epoch timestamp in milliseconds.'),
        updatedOn: z.number().optional().describe('Last update time as a Unix epoch timestamp in milliseconds.'),
        contentEditedOn: z.number().optional().describe('Last content edit time as a Unix epoch timestamp in milliseconds.'),
        createdBy: WidgetMemberSchema.optional().describe('Collaborator who created the widget.'),
        updatedBy: WidgetMemberSchema.optional().describe('Collaborator who last updated the widget.'),
        contentEditedBy: WidgetMemberSchema.optional().describe('Collaborator who last edited the widget content.'),
        locked: z.boolean().optional().describe('Whether the widget is locked against edits by non-facilitators.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators.'),
        viewLink: z.string().optional().describe('Link that opens the mural at this widget.')
    })
    .passthrough()
    .describe('A widget on the mural canvas. Type-specific fields such as shape, style, url or minLines are preserved as returned by Mural.');

const ProviderWidgetsResponseSchema = z.object({
    value: z.array(WidgetSchema),
    next: z.string().optional()
});

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural. Example: "workspace1234.1606743986126".'),
        type: z
            .string()
            .optional()
            .describe(
                'Comma-separated widget types to return, for example "sticky notes,texts". Allowed values: areas, arrows, comments, files, sticky notes, texts, icons, images, shapes. Omit to return all types.'
            ),
        parentId: z.string().optional().describe('Only return widgets contained in this area widget ID. Example: "0-1619509853818".'),
        limit: z.number().int().min(1).max(99).optional().describe('Maximum number of widgets to return per page. Must be less than 100.'),
        cursor: z.string().optional().describe("Opaque pagination token from a previous response's nextCursor. Omit for the first page.")
    })
    .describe('Filters for listing the widgets on a mural.');

const OutputSchema = z
    .object({
        widgets: z.array(WidgetSchema).describe('Widgets on the mural canvas.'),
        nextCursor: z.string().optional().describe('Token to fetch the next page of widgets. Absent when there are no more results.')
    })
    .describe('A page of widgets on the mural canvas.');

/**
 * @tags: [read]
 * @tagReason: Reads widgets from a mural through a GET endpoint without modifying any provider data.
 * @pitfalls: The type filter expects plural, space-separated labels such as "sticky notes" and "texts" and must be re-sent alongside the cursor on every page; drawings are never returned; each entry's fields depend on its type; widget ids are unique only within a mural.
 */
const action = createAction({
    description: 'List every widget (sticky note, text, shape, image, etc.) on a mural canvas.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getmuralwidgets
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets`,
            params: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.parentId !== undefined && { parentId: input.parentId }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderWidgetsResponseSchema.parse(response.data);

        return {
            widgets: parsed.value,
            ...(parsed.next != null && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
