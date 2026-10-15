import { z } from 'zod';
import { createAction } from 'nango';

const UserInfoSchema = z.object({
    id: z.string().describe('Unique ID of the user. Example: "u1651c4ac9145e4b8497d5982"'),
    firstName: z.string().optional().describe('First name of the user. Example: "John"'),
    lastName: z.string().optional().describe('Last name of the user. Example: "Smith"')
});

const VisitorsSettingsSchema = z.object({
    visitors: z.string().optional().describe('Sharing permission granted to anonymous visitors: "read", "write", or "none".'),
    workspaceMembers: z.string().optional().describe('Sharing permission granted to workspace members: "read", "write", or "none".'),
    link: z.string().optional().describe('Visitor link that can be used to access the mural.'),
    expiresOn: z.number().nullable().optional().describe('Unix epoch milliseconds after which the visitor link expires; null when it never expires.')
});

const SharingSettingsSchema = z.object({
    confidential: z.boolean().optional().describe('Whether the mural is confidential and cannot be shared or duplicated.'),
    link: z.string().optional().describe('Invitation link members can use to access the mural.')
});

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('ID of the room that will contain the new mural. Example: 1608152669000'),
        title: z.string().optional().describe('Title of the mural. Omit it or pass an empty string to create an untitled mural.'),
        backgroundColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{8}$/)
            .optional()
            .describe('Background color of the mural as an 8-digit hex string (#RRGGBBAA). Example: "#FAFAFAFF"'),
        folderId: z
            .string()
            .optional()
            .describe('UUID of the folder within the room that will contain the mural. Example: "70b817c1-b5df-46e5-974e-1c87681b0581"'),
        width: z.number().optional().describe('Width of the mural in pixels. Provider default: 9216.'),
        height: z.number().optional().describe('Height of the mural in pixels. Provider default: 6237.'),
        infinite: z.boolean().optional().describe('When true, the mural canvas is borderless and grows as widgets are added.')
    })
    .describe('Input for creating a new, empty mural inside a room.');

const ProviderMuralSchema = z.object({
    id: z.string(),
    title: z.string(),
    roomId: z.number().optional(),
    workspaceId: z.string(),
    backgroundColor: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    infinite: z.boolean().optional(),
    status: z.enum(['active', 'archived']),
    createdOn: z.number(),
    updatedOn: z.number(),
    folderId: z.string().optional(),
    favorite: z.boolean().optional(),
    thumbnailUrl: z.string().optional(),
    embedLink: z.string().optional(),
    state: z.string().optional(),
    viewOnly: z.boolean().optional(),
    createdBy: UserInfoSchema.optional(),
    updatedBy: UserInfoSchema.optional(),
    visitorsSettings: VisitorsSettingsSchema.optional(),
    sharingSettings: SharingSettingsSchema.optional()
});

const CreateMuralResponseSchema = z.object({
    value: ProviderMuralSchema
});

const OutputSchema = z
    .object({
        id: z
            .string()
            .describe('Unique compound ID of the created mural, formatted as "{workspaceId}.{epochMilliseconds}". Example: "nangodev4776.1791996349427"'),
        title: z.string().describe('Title of the created mural; empty string when it was created untitled.'),
        roomId: z.number().optional().describe('ID of the room containing the mural. Example: 1608152669000'),
        workspaceId: z.string().describe('ID of the workspace containing the mural. Example: "nangodev4776"'),
        backgroundColor: z.string().optional().describe('Background color of the mural as an 8-digit hex string. Example: "#FAFAFAFF"'),
        width: z.number().optional().describe('Width of the mural in pixels. Example: 9216'),
        height: z.number().optional().describe('Height of the mural in pixels. Example: 6237'),
        infinite: z.boolean().optional().describe('Whether the mural canvas is borderless and grows as widgets are added.'),
        status: z.enum(['active', 'archived']).describe('Whether the mural is active or archived.'),
        createdOn: z.number().describe('Unix epoch milliseconds when the mural was created.'),
        updatedOn: z.number().describe('Unix epoch milliseconds when the mural was last updated.'),
        folderId: z.string().optional().describe('UUID of the folder containing the mural, when it is inside a folder.'),
        favorite: z.boolean().optional().describe("Whether the mural is in the authenticated user's favorites list."),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
        embedLink: z.string().optional().describe('URL that can be embedded to display the mural in another web page.'),
        state: z.string().optional().describe('Opaque token used to authorize anonymous visitors.'),
        viewOnly: z.boolean().optional().describe('Whether the mural is in view-only mode.'),
        createdBy: UserInfoSchema.optional().describe('User who created the mural.'),
        updatedBy: UserInfoSchema.optional().describe('User who last updated the mural.'),
        visitorsSettings: VisitorsSettingsSchema.optional().describe('Visitor and workspace-member sharing settings for the mural.'),
        sharingSettings: SharingSettingsSchema.optional().describe('Sharing settings for the mural.')
    })
    .describe('The newly created mural.');

/**
 * @tags: [write]
 * @tagReason: Creates a new mural in the provider, a mutation that has no read or destructive effects.
 * @pitfalls: An omitted or empty title creates an untitled mural (empty string), and omitted width, height, and backgroundColor fall back to 9216, 6237, and #FAFAFAFF; murals have no recycle bin, so the created mural persists until it is explicitly deleted.
 */
const action = createAction({
    description: 'Create a new, empty mural inside a room.',
    version: '1.0.0',
    scopes: ['murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.mural.co/public/reference/createmural
            endpoint: '/api/public/v1/murals',
            data: {
                roomId: input.roomId,
                ...(input.title !== undefined && { title: input.title }),
                ...(input.backgroundColor !== undefined && { backgroundColor: input.backgroundColor }),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.width !== undefined && { width: input.width }),
                ...(input.height !== undefined && { height: input.height }),
                ...(input.infinite !== undefined && { infinite: input.infinite })
            },
            // Creating a mural is not idempotent: a retry after a lost response would create a duplicate mural.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- a non-idempotent create must not be retried.
            retries: 0
        });

        const parsed = CreateMuralResponseSchema.parse(response.data);
        const mural = parsed.value;

        return {
            id: mural.id,
            title: mural.title,
            workspaceId: mural.workspaceId,
            ...(mural.backgroundColor !== undefined && { backgroundColor: mural.backgroundColor }),
            ...(mural.width !== undefined && { width: mural.width }),
            ...(mural.height !== undefined && { height: mural.height }),
            status: mural.status,
            createdOn: mural.createdOn,
            updatedOn: mural.updatedOn,
            ...(mural.roomId !== undefined && { roomId: mural.roomId }),
            ...(mural.infinite !== undefined && { infinite: mural.infinite }),
            ...(mural.folderId !== undefined && { folderId: mural.folderId }),
            ...(mural.favorite !== undefined && { favorite: mural.favorite }),
            ...(mural.thumbnailUrl !== undefined && { thumbnailUrl: mural.thumbnailUrl }),
            ...(mural.embedLink !== undefined && { embedLink: mural.embedLink }),
            ...(mural.state !== undefined && { state: mural.state }),
            ...(mural.viewOnly !== undefined && { viewOnly: mural.viewOnly }),
            ...(mural.createdBy !== undefined && { createdBy: mural.createdBy }),
            ...(mural.updatedBy !== undefined && { updatedBy: mural.updatedBy }),
            ...(mural.visitorsSettings !== undefined && { visitorsSettings: mural.visitorsSettings }),
            ...(mural.sharingSettings !== undefined && { sharingSettings: mural.sharingSettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
