import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural. Example: "workspace1234.1606743986126"')
    })
    .describe('Input for retrieving a single mural by its ID.');

const UserSchema = z.object({
    id: z.string().describe('Unique ID of the user. Example: "u1651c4ac9145e4b8497d5982"'),
    firstName: z.string().optional().describe('First name of the collaborator.'),
    lastName: z.string().optional().describe('Last name of the collaborator.')
});

const SharingSettingsSchema = z.object({
    confidential: z.boolean().optional().describe('When true, the mural is confidential and cannot be shared, duplicated, or moved.'),
    link: z.string().optional().describe('Invitation link a member with an account can use to access the mural.')
});

const VisitorsSettingsSchema = z.object({
    visitors: z.string().optional().describe('Permission granted to anonymous visitors: "read", "write", or "none".'),
    workspaceMembers: z.string().optional().describe('Permission granted to workspace members: "read", "write", or "none".'),
    link: z.string().optional().describe('Visitor link that can be used to access the mural.'),
    expiresOn: z
        .number()
        .nullable()
        .optional()
        .describe('Unix epoch-milliseconds timestamp after which the visitor link expires, or null when it never expires.')
});

const MuralSchema = z
    .object({
        id: z.string().describe('Unique ID of the mural. Example: "workspace1234.1606743986126"'),
        title: z.string().optional().describe('Title of the mural.'),
        roomId: z.number().optional().describe('ID of the room containing the mural.'),
        workspaceId: z.string().optional().describe('Unique ID of the workspace containing the mural.'),
        status: z.string().optional().describe('Whether the mural is "active" or "archived".'),
        backgroundColor: z.string().optional().describe('Background color of the mural as an 8-digit hex value. Example: "#FAFAFAFF"'),
        width: z.number().optional().describe('Width of the mural canvas in pixels.'),
        height: z.number().optional().describe('Height of the mural canvas in pixels.'),
        infinite: z.boolean().optional().describe('When true, the mural canvas is borderless and grows as widgets are added.'),
        favorite: z.boolean().optional().describe('When true, the mural is in the favorite list for the authenticated user.'),
        createdOn: z.number().optional().describe('Unix epoch-milliseconds timestamp when the mural was created.'),
        createdBy: UserSchema.optional().describe('The collaborator who created the mural.'),
        updatedOn: z.number().optional().describe('Unix epoch-milliseconds timestamp of the last mural update.'),
        updatedBy: UserSchema.optional().describe('The collaborator who last updated the mural.'),
        sharingSettings: SharingSettingsSchema.optional().describe('Sharing configuration for the mural.'),
        visitorsSettings: VisitorsSettingsSchema.optional().describe('Visitor access configuration for the mural.'),
        visitorAvatarTheme: z.string().optional().describe('Avatar theme for visitors: "animals", "music", or "travel".'),
        timerSoundTheme: z.string().optional().describe('Timer sound theme for the mural: "airplane", "cello", or "cuckoo".'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be embedded in a public web page to display the mural.'),
        state: z.string().optional().describe('Value used to authorize anonymous visitors to the mural.')
    })
    .describe('A single Mural canvas and its settings.');

const ResponseSchema = z.object({
    value: MuralSchema
});

/**
 * @tags: [read]
 * @tagReason: Reads an existing mural's details without modifying it.
 * @pitfalls: Mural deletes are permanent with no recycle bin, so fetching a deleted or nonexistent mural returns 404 MURAL_NOT_FOUND rather than a soft-deleted record; createdOn and updatedOn are Unix epoch-milliseconds, not ISO strings.
 */
const action = createAction({
    description: "Retrieve a single mural's full details by ID.",
    version: '1.0.0',
    input: InputSchema,
    output: MuralSchema,

    exec: async (nango, input): Promise<z.infer<typeof MuralSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getmuralbyid
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}`,
            retries: 3
        });

        const parsed = ResponseSchema.parse(response.data);

        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
