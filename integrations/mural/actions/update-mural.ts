import { z } from 'zod';
import { createAction } from 'nango';

const UserInfoSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the collaborator.'),
        firstName: z.string().optional().describe("Collaborator's first name."),
        lastName: z.string().optional().describe("Collaborator's last name.")
    })
    .describe('A user associated with the mural.');

const MuralVisitorSettingsSchema = z
    .object({
        link: z.string().optional().describe('Link that a visitor can use to access the mural.'),
        visitors: z.enum(['read', 'write', 'none']).optional().describe('Sharing permission granted to visitors.'),
        workspaceMembers: z.enum(['read', 'write', 'none']).optional().describe('Sharing permission granted to workspace members.'),
        expiresOn: z
            .number()
            .nullable()
            .optional()
            .describe('Unix timestamp in milliseconds after which the visitor link expires, or null when it never expires.')
    })
    .describe('Visitor sharing settings for the mural.');

const MuralSharingSettingsSchema = z
    .object({
        link: z.string().optional().describe('Link that a member with an account can use to access the mural.'),
        confidential: z.boolean().optional().describe('Whether the mural is confidential.')
    })
    .describe('Member sharing settings for the mural.');

const InputSchema = z
    .object({
        muralId: z.string().describe('Unique identifier of the mural to update. Example: "workspace1234.1606743986126"'),
        title: z.string().optional().describe('New title for the mural. Omit to keep the current title.'),
        backgroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{8}$/)
            .optional()
            .describe('New background color as an 8-digit #RRGGBBAA hex value. Example: "#FAFAFAFF"'),
        width: z.number().int().min(3000).max(60000).optional().describe('New width of the mural in pixels, between 3000 and 60000.'),
        height: z.number().int().min(3000).max(60000).optional().describe('New height of the mural in pixels, between 3000 and 60000.')
    })
    .describe('The mural to update and the fields to change. Only provided fields are modified.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the mural.'),
        title: z.string().describe('Title of the mural.'),
        backgroundColor: z.string().optional().describe('Background color of the mural as an 8-digit #RRGGBBAA hex value. Example: "#FAFAFAFF"'),
        width: z.number().optional().describe('Width of the mural in pixels.'),
        height: z.number().optional().describe('Height of the mural in pixels.'),
        status: z.enum(['active', 'archived']).describe('Whether the mural is active or archived.'),
        workspaceId: z.string().describe('Unique identifier of the workspace containing the mural.'),
        roomId: z.number().optional().describe('Identifier of the room containing the mural.'),
        createdOn: z.number().describe('Unix timestamp in milliseconds when the mural was created.'),
        updatedOn: z.number().describe('Unix timestamp in milliseconds when the mural was last updated.'),
        createdBy: UserInfoSchema.optional().describe('User who created the mural.'),
        updatedBy: UserInfoSchema.optional().describe('User who last updated the mural.'),
        folderId: z.string().optional().describe('UUID of the folder this mural belongs to.'),
        favorite: z.boolean().optional().describe("Whether the mural is in the current user's favorites."),
        infinite: z.boolean().optional().describe('Whether the mural canvas is borderless and grows as widgets are added.'),
        viewOnly: z.boolean().optional().describe('Whether the mural is in view-only mode.'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be used to embed the mural in a web page.'),
        timerSoundTheme: z.enum(['airplane', 'cello', 'cuckoo']).optional().describe('Timer sound theme for the mural.'),
        visitorAvatarTheme: z.enum(['animals', 'music', 'travel']).optional().describe('Visitor avatar theme for the mural.'),
        visitorsSettings: MuralVisitorSettingsSchema.optional().describe('Visitor sharing settings for the mural.'),
        sharingSettings: MuralSharingSettingsSchema.optional().describe('Member sharing settings for the mural.')
    })
    .describe('The updated mural.');

const MuralResponseSchema = z.object({
    value: OutputSchema
});

/**
 * @tags: [write]
 * @tagReason: Updates an existing mural's title, background color, and/or dimensions through the provider API.
 * @pitfalls: Requires the authenticated user to own or be a member of the mural; the update response can omit optional fields (such as infinite) that a later read returns, so re-fetch the mural when you need the complete object.
 */
const action = createAction({
    description: "Update a mural's title, background color, or dimensions. Partial merge.",
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.mural.co/public/reference/updatemuralbyid
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.muralId)}`,
            data: {
                ...(input.title !== undefined && { title: input.title }),
                ...(input.backgroundColor !== undefined && { backgroundColor: input.backgroundColor }),
                ...(input.width !== undefined && { width: input.width }),
                ...(input.height !== undefined && { height: input.height })
            },
            retries: 3
        });

        const parsed = MuralResponseSchema.parse(response.data);
        return parsed.value;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
