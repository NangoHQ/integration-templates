import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('ID of the mural to duplicate. Example: "nangodev4776.1791984276717"'),
        roomId: z.number().int().positive().describe('Numeric ID of the room that will contain the duplicate. Example: 1791984264781658'),
        title: z.string().describe('Title for the duplicated mural. Required by the provider.'),
        folderId: z.string().optional().describe('UUID of the target folder inside the room where the duplicate is created.'),
        infinite: z.boolean().optional().describe('When true, the duplicate has a borderless canvas that grows as widgets are added.')
    })
    .describe('Input for duplicating an existing mural into a target room.');

const UserInfoSchema = z.object({
    id: z.string().describe('Unique ID of the user.'),
    firstName: z.string().optional().describe('First name of the user.'),
    lastName: z.string().optional().describe('Last name of the user.')
});

const SharingSettingsSchema = z.object({
    confidential: z.boolean().optional().describe('When true, the mural is confidential and cannot be shared or duplicated.'),
    link: z.string().optional().describe('Link that a member with an account can use to access the mural.')
});

const VisitorsSettingsSchema = z.object({
    visitors: z.enum(['read', 'write', 'none']).describe('Permission level for anonymous visitors.'),
    workspaceMembers: z.enum(['read', 'write', 'none']).describe('Permission level for workspace members.'),
    link: z.string().optional().describe('Link that a visitor can use to access the mural.'),
    expiresOn: z.number().nullable().optional().describe('Unix epoch milliseconds after which the visitor link expires, or null when it never expires.')
});

const MuralSchema = z
    .object({
        id: z.string().describe('Unique ID of the newly created duplicate mural.'),
        title: z.string().describe('Title of the duplicate mural.'),
        roomId: z.number().optional().describe('ID of the room containing the duplicate mural.'),
        workspaceId: z.string().describe('ID of the workspace containing the duplicate mural.'),
        folderId: z.string().optional().describe('UUID of the folder containing the duplicate mural, if any.'),
        status: z.enum(['active', 'archived']).describe("Whether the duplicate mural is 'active' or 'archived'."),
        infinite: z.boolean().optional().describe('When true, the mural canvas is borderless and grows as widgets are added.'),
        width: z.number().optional().describe('Width of the mural in pixels.'),
        height: z.number().optional().describe('Height of the mural in pixels.'),
        backgroundColor: z.string().optional().describe('Background color of the mural as an #RRGGBBAA hex string.'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be embedded in a web page.'),
        _canvasLink: z.string().optional().describe('URL used to open the mural canvas.'),
        state: z.string().optional().describe('Opaque value used to authorize anonymous visitors.'),
        favorite: z.boolean().optional().describe('When true, the mural is in the current user favorite list.'),
        viewOnly: z.boolean().optional().describe('When true, the mural is in view-only mode.'),
        timerSoundTheme: z.enum(['airplane', 'cello', 'cuckoo']).optional().describe('Timer sound theme of the mural.'),
        visitorAvatarTheme: z.enum(['animals', 'music', 'travel']).optional().describe('Visitor avatar theme of the mural.'),
        createdOn: z.number().describe('Unix epoch milliseconds when the mural was created.'),
        updatedOn: z.number().describe('Unix epoch milliseconds when the mural was last updated.'),
        createdBy: UserInfoSchema.optional().describe('User who created the mural.'),
        updatedBy: UserInfoSchema.optional().describe('User who last updated the mural.'),
        sharingSettings: SharingSettingsSchema.optional().describe('Sharing settings of the mural.'),
        visitorsSettings: VisitorsSettingsSchema.optional().describe('Visitor access settings of the mural.')
    })
    .describe('The newly created duplicate mural.');

const ProviderResponseSchema = z.object({
    value: MuralSchema
});

/**
 * @tags: [write]
 * @tagReason: Creates a new duplicate mural in the target room through a provider POST; it does not read or modify any existing resource directly.
 * @pitfalls: The duplicate reuses the source mural's widget IDs, so widget IDs are not unique across murals and must be scoped by mural ID; confidential murals cannot be duplicated.
 */
const action = createAction({
    description: 'Duplicate an existing mural, including its widgets, into a target room with a new title.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: MuralSchema,

    exec: async (nango, input): Promise<z.infer<typeof MuralSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/duplicatemural
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}/duplicate`,
            data: {
                roomId: input.roomId,
                title: input.title,
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.infinite !== undefined && { infinite: input.infinite })
            },
            // Duplicate creates a new mural on every call and has no idempotency key, so a retry after a lost response would create a second copy.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
