import { z } from 'zod';
import { createAction } from 'nango';

const UserInfoBriefSchema = z.object({
    id: z.string().optional().describe('Unique ID of the collaborator.'),
    firstName: z.string().optional().describe('First name of the collaborator.'),
    lastName: z.string().optional().describe('Last name of the collaborator.')
});

const VisitorSettingsSchema = z.object({
    visitors: z.enum(['read', 'write', 'none']).optional().describe('Sharing permission granted to anonymous visitors.'),
    workspaceMembers: z.enum(['read', 'write', 'none']).optional().describe('Sharing permission granted to workspace members.'),
    link: z.string().optional().describe('Visitor link that can be used to access the mural.'),
    expiresOn: z.number().optional().describe('Unix epoch milliseconds after which the visitor link expires; omitted when the link does not expire.')
});

const SharingSettingsSchema = z.object({
    confidential: z.boolean().optional().describe('Whether the mural is confidential, which disables share links and duplication.'),
    link: z.string().optional().describe('Invitation link a member with an account can use to access the mural.')
});

const MuralSchema = z.object({
    id: z.string().describe('Unique ID of the mural. Example: "workspace1234.1608152669000".'),
    title: z.string().describe('Title of the mural.'),
    status: z.enum(['active', 'archived']).describe('Whether the mural is active or archived.'),
    createdOn: z.number().describe('Unix epoch milliseconds when the mural was created.'),
    updatedOn: z.number().describe('Unix epoch milliseconds when the mural was last updated.'),
    roomId: z.number().describe('ID of the room that directly contains the mural.'),
    workspaceId: z.string().describe('ID of the workspace that contains the mural.'),
    createdBy: UserInfoBriefSchema.optional().describe('Collaborator who created the mural.'),
    updatedBy: UserInfoBriefSchema.optional().describe('Collaborator who last updated the mural.'),
    folderId: z.string().optional().describe('UUID of the folder the mural is filed in, when it belongs to one.'),
    thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
    favorite: z.boolean().optional().describe('Whether the mural is in the authenticated user\u2019s favorites.'),
    infinite: z.boolean().optional().describe('Whether the mural canvas is borderless and grows as widgets are added.'),
    state: z.string().optional().describe('Opaque value used to authorize anonymous visitors.'),
    visitorsSettings: VisitorSettingsSchema.optional().describe('Visitor sharing configuration for the mural.'),
    sharingSettings: SharingSettingsSchema.optional().describe('Member sharing configuration for the mural.')
});

const InputSchema = z
    .object({
        roomId: z.string().describe('ID of the room whose murals should be listed. Example: "1610033618903".'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of murals to return in a single page (1-100).'),
        cursor: z.string().optional().describe('Opaque pagination token returned as `nextCursor` by a previous call; omit to fetch the first page.'),
        status: z.enum(['active', 'archived']).optional().describe('When set, only return murals with this status.'),
        sortBy: z
            .enum(['lastCreated', 'lastModified', 'oldest'])
            .optional()
            .describe('Sort order for the returned murals; the provider default order is used when omitted.'),
        folderId: z.string().optional().describe('When set, only return murals filed in this folder UUID.')
    })
    .describe('Parameters for listing the murals that live directly in a room.');

const OutputSchema = z
    .object({
        murals: z.array(MuralSchema).describe('Murals that live directly in the requested room.'),
        nextCursor: z
            .string()
            .optional()
            .describe('Opaque token to pass as `cursor` to fetch the next page; an empty `murals` array means there are no more results.')
    })
    .describe('The murals that live directly in the requested room, plus an optional next-page cursor.');

const ProviderUserInfoBriefSchema = z.object({
    id: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional()
});

const ProviderVisitorSettingsSchema = z.object({
    visitors: z.enum(['read', 'write', 'none']).nullable().optional(),
    workspaceMembers: z.enum(['read', 'write', 'none']).nullable().optional(),
    link: z.string().nullable().optional(),
    expiresOn: z.number().nullable().optional()
});

const ProviderSharingSettingsSchema = z.object({
    confidential: z.boolean().nullable().optional(),
    link: z.string().nullable().optional()
});

const ProviderMuralSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['active', 'archived']),
    createdOn: z.number(),
    updatedOn: z.number(),
    roomId: z.number(),
    workspaceId: z.string(),
    createdBy: ProviderUserInfoBriefSchema.nullable().optional(),
    updatedBy: ProviderUserInfoBriefSchema.nullable().optional(),
    folderId: z.string().nullable().optional(),
    thumbnailUrl: z.string().nullable().optional(),
    favorite: z.boolean().nullable().optional(),
    infinite: z.boolean().nullable().optional(),
    state: z.string().nullable().optional(),
    visitorsSettings: ProviderVisitorSettingsSchema.nullable().optional(),
    sharingSettings: ProviderSharingSettingsSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderMuralSchema),
    next: z.string().nullable().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the murals in a room without modifying any provider state.
 * @pitfalls: A room that does not exist or is not accessible fails with a 404 rather than returning an empty list, and `nextCursor` can be returned even on the final page, so only an empty `murals` array reliably signals the end of results.
 */
const action = createAction({
    description: 'List the murals that live directly inside a specific room.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['murals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/getroommurals
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(input.roomId)}/murals`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const murals = parsed.value.map((mural) => {
            return {
                id: mural.id,
                title: mural.title,
                status: mural.status,
                createdOn: mural.createdOn,
                updatedOn: mural.updatedOn,
                roomId: mural.roomId,
                workspaceId: mural.workspaceId,
                ...(mural.createdBy != null && {
                    createdBy: {
                        ...(mural.createdBy.id != null && { id: mural.createdBy.id }),
                        ...(mural.createdBy.firstName != null && { firstName: mural.createdBy.firstName }),
                        ...(mural.createdBy.lastName != null && { lastName: mural.createdBy.lastName })
                    }
                }),
                ...(mural.updatedBy != null && {
                    updatedBy: {
                        ...(mural.updatedBy.id != null && { id: mural.updatedBy.id }),
                        ...(mural.updatedBy.firstName != null && { firstName: mural.updatedBy.firstName }),
                        ...(mural.updatedBy.lastName != null && { lastName: mural.updatedBy.lastName })
                    }
                }),
                ...(mural.folderId != null && { folderId: mural.folderId }),
                ...(mural.thumbnailUrl != null && { thumbnailUrl: mural.thumbnailUrl }),
                ...(mural.favorite != null && { favorite: mural.favorite }),
                ...(mural.infinite != null && { infinite: mural.infinite }),
                ...(mural.state != null && { state: mural.state }),
                ...(mural.visitorsSettings != null && {
                    visitorsSettings: {
                        ...(mural.visitorsSettings.visitors != null && { visitors: mural.visitorsSettings.visitors }),
                        ...(mural.visitorsSettings.workspaceMembers != null && { workspaceMembers: mural.visitorsSettings.workspaceMembers }),
                        ...(mural.visitorsSettings.link != null && { link: mural.visitorsSettings.link }),
                        ...(mural.visitorsSettings.expiresOn != null && { expiresOn: mural.visitorsSettings.expiresOn })
                    }
                }),
                ...(mural.sharingSettings != null && {
                    sharingSettings: {
                        ...(mural.sharingSettings.confidential != null && { confidential: mural.sharingSettings.confidential }),
                        ...(mural.sharingSettings.link != null && { link: mural.sharingSettings.link })
                    }
                })
            };
        });

        return {
            murals,
            ...(parsed.next != null && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
