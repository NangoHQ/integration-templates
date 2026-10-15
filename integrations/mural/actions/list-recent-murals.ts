import { z } from 'zod';
import { createAction } from 'nango';

const MuralUserSchema = z.object({
    id: z.string().describe('Unique identifier of the user. Example: "u1651c4ac9145e4b8497d5982"'),
    firstName: z.string().optional().describe('First name of the user. Example: "John"'),
    lastName: z.string().optional().describe('Last name of the user. Example: "Smith"')
});

const MuralVisitorSettingsSchema = z.object({
    link: z.string().optional().describe('Link that a visitor can use to access the mural.'),
    visitors: z.string().describe('Permissions granted to anonymous visitors: "read", "write", or "none".'),
    workspaceMembers: z.string().describe('Permissions granted to workspace members: "read", "write", or "none".'),
    expiresOn: z.number().nullable().optional().describe('Unix timestamp in milliseconds after which the visitor link expires, or null when it never expires.')
});

const MuralSharingSettingsSchema = z.object({
    link: z.string().optional().describe('Link that a member with an account can use to access the mural.'),
    confidential: z.boolean().optional().describe('Whether the mural is confidential and disallows share links and duplication.')
});

const MuralSchema = z.object({
    id: z.string().describe('Unique ID of the mural. Example: "workspace1234.1608152669000"'),
    title: z.string().describe('Title of the mural; an empty string when the mural is untitled.'),
    status: z.string().describe('Whether the mural is "active" or "archived".'),
    createdOn: z.number().describe('Unix timestamp in milliseconds when the mural was created.'),
    updatedOn: z.number().describe('Unix timestamp in milliseconds when the mural was last updated; equals createdOn when never changed.'),
    roomId: z.number().describe('ID of the room containing the mural.'),
    workspaceId: z.string().describe('Unique ID of the workspace containing the mural.'),
    createdBy: MuralUserSchema.optional().describe('The user who created the mural.'),
    updatedBy: MuralUserSchema.optional().describe('The last user who updated the mural.'),
    folderId: z.string().optional().describe('UUID of the folder this mural belongs to, when the mural is in a folder.'),
    favorite: z.boolean().optional().describe('Whether the mural is in the favorite list of the authenticated user.'),
    infinite: z.boolean().optional().describe('Whether the mural canvas is borderless and grows as widgets are added.'),
    state: z.string().optional().describe('Value used to authorize anonymous visitors.'),
    thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural.'),
    _canvasLink: z.string().optional().describe('Direct link to open the mural canvas.'),
    sharingSettings: MuralSharingSettingsSchema.optional().describe('Share settings for members with an account.'),
    visitorsSettings: MuralVisitorSettingsSchema.optional().describe('Share settings for anonymous visitors.')
});

const InputSchema = z
    .object({
        workspaceId: z.string().describe('Unique identifier of the workspace to list recently opened murals from. Example: "workspace1234"'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of murals to return per page (1-100). Omit to use the provider default.'),
        next: z.string().min(1).optional().describe('Pagination token from the previous response to fetch the next page. Omit for the first page.')
    })
    .describe("Filters for listing the authenticated user's recently opened murals in a workspace.");

const OutputSchema = z
    .object({
        value: z.array(MuralSchema).describe('The page of recently opened murals returned by the provider.'),
        next: z
            .string()
            .optional()
            .describe('Token to fetch another page of murals. It can still be returned on the final page, so stop when `value` is empty.')
    })
    .describe("A page of the authenticated user's recently opened active murals in a workspace.");

const ProviderResponseSchema = z.object({
    value: z.array(
        z
            .object({
                _canvasLink: z.string().optional(),
                createdBy: MuralUserSchema.optional(),
                createdOn: z.number(),
                favorite: z.boolean().optional(),
                id: z.string(),
                infinite: z.boolean().optional(),
                roomId: z.number(),
                sharingSettings: MuralSharingSettingsSchema.optional(),
                state: z.string().optional(),
                status: z.string(),
                thumbnailUrl: z.string().optional(),
                title: z.string(),
                updatedBy: MuralUserSchema.optional(),
                updatedOn: z.number(),
                folderId: z.string().optional(),
                visitorsSettings: MuralVisitorSettingsSchema.optional(),
                workspaceId: z.string()
            })
            .passthrough()
    ),
    next: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads the authenticated user's recently opened murals from the provider without mutating any state.
 * @pitfalls: Only the authenticated user's recently opened active murals are returned, a next token can appear even on the final page so treat an empty value array as the end of results, and next tokens expire so they must be used promptly.
 */
const action = createAction({
    description: 'List the murals most recently opened by the authenticated user in a workspace.',
    version: '1.0.0',
    scopes: ['murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getworkspacerecentmurals
        const response = await nango.get({
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/murals/recent`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.next !== undefined && { next: input.next })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            value: parsed.value.map((mural) => ({
                id: mural.id,
                title: mural.title,
                status: mural.status,
                createdOn: mural.createdOn,
                updatedOn: mural.updatedOn,
                roomId: mural.roomId,
                workspaceId: mural.workspaceId,
                ...(mural.createdBy != null && { createdBy: mural.createdBy }),
                ...(mural.updatedBy != null && { updatedBy: mural.updatedBy }),
                ...(mural.folderId != null && { folderId: mural.folderId }),
                ...(mural.favorite != null && { favorite: mural.favorite }),
                ...(mural.infinite != null && { infinite: mural.infinite }),
                ...(mural.state != null && { state: mural.state }),
                ...(mural.thumbnailUrl != null && { thumbnailUrl: mural.thumbnailUrl }),
                ...(mural._canvasLink != null && { _canvasLink: mural._canvasLink }),
                ...(mural.sharingSettings != null && { sharingSettings: mural.sharingSettings }),
                ...(mural.visitorsSettings != null && { visitorsSettings: mural.visitorsSettings })
            })),
            ...(parsed.next != null && { next: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
