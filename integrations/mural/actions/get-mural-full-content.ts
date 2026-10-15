import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique ID of the mural, in the form "<workspaceId>.<timestamp>". Example: "workspace1234.1606743986126"')
    })
    .describe('Input identifying the mural whose metadata, widgets, tags, and members should be returned.');

const ColorSchema = z.string().describe('Color in hex-with-alpha format. Example: "#FAFAFAFF"');

const ActorSchema = z
    .object({
        id: z.string().optional().describe('Unique ID of the collaborator or one-time visitor.'),
        firstName: z.string().optional().describe('First name of the collaborator.'),
        lastName: z.string().optional().describe('Last name of the collaborator.'),
        email: z.string().optional().describe('Email address of the collaborator.'),
        alias: z.string().optional().describe('Display alias of a one-time visitor.')
    })
    .passthrough();

const WidgetStyleSchema = z
    .object({
        backgroundColor: ColorSchema.optional(),
        borderColor: ColorSchema.optional(),
        borderStyle: z.string().optional().describe('Border style of the widget, e.g. "solid", "dashed", "dotted".'),
        borderWidth: z.number().optional().describe('Border width of the widget in px.'),
        bold: z.boolean().optional().describe('Whether the widget text is bold.'),
        italic: z.boolean().optional().describe('Whether the widget text is italic.'),
        underline: z.boolean().optional().describe('Whether the widget text is underlined.'),
        strike: z.boolean().optional().describe('Whether the widget text is struck through.'),
        font: z.string().optional().describe('Font family used by the widget text.'),
        fontColor: ColorSchema.optional(),
        fontSize: z.number().optional().describe('Font size of the widget text in px.'),
        textAlign: z.string().optional().describe('Text alignment within the widget, e.g. "left", "center", "right".'),
        color: ColorSchema.optional(),
        strokeColor: ColorSchema.optional(),
        strokeStyle: z.string().optional().describe('Stroke style of an arrow connector, e.g. "solid", "dashed", "dotted".'),
        strokeWidth: z.number().optional().describe('Stroke width of an arrow connector in px.'),
        titleFontSize: z.number().optional().describe('Font size of the widget title in px.')
    })
    .passthrough();

const WidgetSchema = z
    .object({
        id: z.string().describe('Unique ID of the widget within its mural.'),
        type: z.string().describe('Type of the widget, e.g. "sticky note", "text", "shape", "arrow", "area", "comment", "file", "image", "icon".'),
        title: z.string().optional().describe('Title of the widget in the outline.'),
        text: z.string().optional().describe('Plain text content of the widget.'),
        htmlText: z.string().optional().describe('HTML-formatted content of the widget; takes priority over text when set.'),
        shape: z.string().optional().describe('Shape of the widget, e.g. "circle" or "rectangle" for sticky notes, or the shape name for shape widgets.'),
        x: z.number().optional().describe('Horizontal position of the widget in px.'),
        y: z.number().optional().describe('Vertical position of the widget in px.'),
        width: z.number().optional().describe('Width of the widget in px.'),
        height: z.number().optional().describe('Height of the widget in px.'),
        rotation: z.number().optional().describe('Rotation angle of the widget in degrees.'),
        stackingOrder: z.number().optional().describe('Z-index stacking order of the widget.'),
        minLines: z.number().optional().describe('Minimum number of text lines reserved for a sticky note.'),
        fixedWidth: z.boolean().optional().describe('Whether a text box has a fixed width.'),
        hidden: z.boolean().optional().describe('Whether the widget is hidden from non-facilitators.'),
        invisible: z.boolean().optional().describe('Whether the widget is invisible.'),
        locked: z.boolean().optional().describe('Whether the widget is locked for non-facilitators.'),
        lockedByFacilitator: z.boolean().optional().describe('Whether the widget is locked by a facilitator.'),
        hideEditor: z.boolean().optional().describe('Whether the last editor is hidden because Private Mode is enabled.'),
        hideOwner: z.boolean().optional().describe('Whether the creator is hidden because Private Mode is enabled.'),
        instruction: z.string().optional().describe('Facilitator-only instructions attached to the widget.'),
        parentId: z.string().nullable().optional().describe('ID of the area widget that contains this widget, or null when it is not inside an area.'),
        presentationIndex: z.number().optional().describe('Order of the widget in the outline/presentation.'),
        viewLink: z.string().optional().describe('URL that opens the mural focused on this widget.'),
        contentEditedOn: z.number().optional().describe('Unix epoch milliseconds when the widget content was last edited.'),
        createdOn: z.number().optional().describe('Unix epoch milliseconds when the widget was created.'),
        updatedOn: z.number().optional().describe('Unix epoch milliseconds when the widget was last updated.'),
        createdBy: ActorSchema.optional().describe('Collaborator or visitor who created the widget.'),
        updatedBy: ActorSchema.optional().describe('Collaborator or visitor who last updated the widget.'),
        contentEditedBy: ActorSchema.optional().describe('Collaborator or visitor who last edited the widget content.'),
        tags: z.array(z.string()).optional().describe('IDs of the tags applied to the widget.'),
        style: WidgetStyleSchema.optional().describe('Style properties of the widget; available keys depend on the widget type.')
    })
    .passthrough();

const TagSchema = z
    .object({
        id: z.string().describe('Unique ID of the tag.'),
        text: z.string().describe('Text displayed in the tag.'),
        backgroundColor: ColorSchema.optional(),
        borderColor: ColorSchema.optional(),
        color: ColorSchema.optional()
    })
    .passthrough();

const MemberPermissionsSchema = z
    .object({
        owner: z.boolean().optional().describe('Whether the user owns the mural.'),
        facilitator: z.boolean().optional().describe('Whether the user is a facilitator of the mural.')
    })
    .passthrough();

const MemberSchema = z
    .object({
        id: z.string().describe('Unique ID of the mural user.'),
        type: z.string().optional().describe('Type of the mural user, either "member" or "guest".'),
        email: z.string().optional().describe('Email address of the member.'),
        avatar: z.string().optional().describe('URL of the member avatar image.'),
        firstName: z.string().optional().describe('First name of the member.'),
        lastName: z.string().optional().describe('Last name of the member.'),
        createdOn: z.number().optional().describe('Unix epoch milliseconds when the user record was created.'),
        permissions: MemberPermissionsSchema.optional().describe('Mural-specific permissions for this user.')
    })
    .passthrough();

const SharingSettingsSchema = z
    .object({
        link: z.string().optional().describe('Share link that a member with an account can use to access the mural.'),
        confidential: z.boolean().optional().describe('Whether the mural is confidential (no share link, cannot be duplicated or moved across workspaces).')
    })
    .passthrough();

const VisitorsSettingsSchema = z
    .object({
        link: z.string().optional().describe('Link that a visitor can use to access the mural.'),
        visitors: z.string().optional().describe('Permission level granted to visitors, e.g. "none", "read", "write".'),
        workspaceMembers: z.string().optional().describe('Permission level granted to workspace members, e.g. "none", "read", "write".'),
        expiresOn: z.number().nullable().optional().describe('Unix epoch milliseconds after which the visitor link expires, or null when it does not expire.')
    })
    .passthrough();

const MuralSchema = z
    .object({
        id: z.string().describe('Unique ID of the mural.'),
        title: z.string().optional().describe('Title of the mural.'),
        status: z.string().optional().describe('Whether the mural is "active" or "archived".'),
        workspaceId: z.string().optional().describe('ID of the workspace containing the mural.'),
        roomId: z.number().optional().describe('ID of the room containing the mural.'),
        folderId: z.string().optional().describe('UUID of the folder this mural belongs to, when it is in a folder.'),
        width: z.number().optional().describe('Width of the mural canvas in px.'),
        height: z.number().optional().describe('Height of the mural canvas in px.'),
        infinite: z.boolean().optional().describe('Whether the mural canvas is borderless and grows as widgets are added.'),
        backgroundColor: ColorSchema.optional(),
        favorite: z.boolean().optional().describe('Whether the mural is in the authenticated user favorites list.'),
        viewOnly: z.boolean().optional().describe('Whether the mural is in view-only mode.'),
        state: z.string().optional().describe('Opaque value used to authorize anonymous visitors.'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be embedded to display the mural in a web page.'),
        createdOn: z.number().optional().describe('Unix epoch milliseconds when the mural was created.'),
        updatedOn: z.number().optional().describe('Unix epoch milliseconds when the mural was last updated.'),
        createdBy: ActorSchema.optional().describe('Collaborator who created the mural.'),
        updatedBy: ActorSchema.optional().describe('Collaborator who last updated the mural.'),
        sharingSettings: SharingSettingsSchema.optional().describe('Sharing settings of the mural.'),
        visitorsSettings: VisitorsSettingsSchema.optional().describe('Visitor access settings of the mural.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        mural: MuralSchema.describe('Metadata for the mural itself.'),
        widgets: z.array(WidgetSchema).describe('Every widget on the mural canvas, across all widget types.'),
        tags: z.array(TagSchema).describe('Tags defined in the mural.'),
        members: z.array(MemberSchema).describe('Members and guests with access to the mural.')
    })
    .describe('A mural merged with its complete widget list, its tags, and its member list.');

const MuralResponseSchema = z.object({
    value: MuralSchema
});

const WidgetsPageSchema = z.object({
    value: z.array(WidgetSchema),
    next: z.string().optional()
});

const TagsResponseSchema = z.object({
    value: z.array(TagSchema)
});

const MembersPageSchema = z.object({
    value: z.array(MemberSchema),
    next: z.string().optional()
});

const WIDGETS_PAGE_SIZE = 100;
const MEMBERS_PAGE_SIZE = 100;

/**
 * @tags: [read]
 * @tagReason: Reads the mural, its widgets, its tags, and its members from the provider; it never mutates provider state.
 * @pitfalls: The member list requires the users:read scope while the mural, widgets, and tags reads require murals:read, so a connection lacking users:read fails the whole call; widget IDs are only unique within a mural (duplicating a mural reuses the same widget IDs), so pair each widget with the mural ID when using it as a key; a mural with no widgets or tags returns empty arrays rather than an error.
 */
const action = createAction({
    description: 'COMPOSITE: get a mural full picture in one call - its own metadata, every widget on its canvas, its tags, and its member list.',
    version: '1.0.0',
    scopes: ['murals:read', 'users:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getmuralbyid
        const muralResponse = await nango.get({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}`,
            retries: 3
        });

        const mural = MuralResponseSchema.parse(muralResponse.data).value;

        const widgets: z.infer<typeof WidgetSchema>[] = [];
        let cursor: string | undefined = undefined;
        let hasMore = true;

        while (hasMore) {
            const config: ProxyConfiguration = {
                // https://developers.mural.co/public/reference/getmuralwidgets
                endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/widgets`,
                params: cursor === undefined ? { limit: WIDGETS_PAGE_SIZE } : { limit: WIDGETS_PAGE_SIZE, next: cursor },
                retries: 3
            };

            const response = await nango.get(config);
            const page = WidgetsPageSchema.parse(response.data);

            if (page.value.length === 0) {
                hasMore = false;
            } else {
                widgets.push(...page.value);

                if (page.next === undefined || page.next === cursor) {
                    hasMore = false;
                } else {
                    cursor = page.next;
                }
            }
        }

        // https://developers.mural.co/public/reference/getmuraltags
        const tagsResponse = await nango.get({
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/tags`,
            retries: 3
        });

        const tags = TagsResponseSchema.parse(tagsResponse.data).value;

        const members: z.infer<typeof MemberSchema>[] = [];
        let membersCursor: string | undefined = undefined;
        let hasMoreMembers = true;

        while (hasMoreMembers) {
            const config: ProxyConfiguration = {
                // https://developers.mural.co/public/reference/getmuralusers
                endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/users`,
                params: membersCursor === undefined ? { limit: MEMBERS_PAGE_SIZE } : { limit: MEMBERS_PAGE_SIZE, next: membersCursor },
                retries: 3
            };

            const response = await nango.get(config);
            const page = MembersPageSchema.parse(response.data);

            // Mural can return `next` on the final page, so an empty page is the end signal.
            if (page.value.length === 0) {
                hasMoreMembers = false;
            } else {
                members.push(...page.value);

                if (page.next === undefined || page.next === membersCursor) {
                    hasMoreMembers = false;
                } else {
                    membersCursor = page.next;
                }
            }
        }

        return {
            mural,
            widgets,
            tags,
            members
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
