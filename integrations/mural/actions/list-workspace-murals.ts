import { z } from 'zod';
import { createAction } from 'nango';

const LIMIT = 100;

const UserBriefSchema = z
    .object({
        id: z.string().describe('Unique ID of the collaborator. Example: "u6ed91a0eb0c5cb4ae8713013".'),
        firstName: z.string().optional().describe('First name of the collaborator.'),
        lastName: z.string().optional().describe('Last name of the collaborator.')
    })
    .describe('A Mural user referenced on a mural.');

const SharingSettingsSchema = z
    .object({
        link: z.string().optional().describe('Share link that a member with an account can use to access the mural.'),
        confidential: z.boolean().optional().describe('When true, the mural is confidential and cannot be shared by link or duplicated across workspaces.')
    })
    .describe('Sharing settings for the mural.');

const VisitorSettingsSchema = z
    .object({
        link: z.string().optional().describe('Link that a visitor can use to access the mural.'),
        visitors: z.string().optional().describe('Visitor permission: "read", "write", or "none".'),
        workspaceMembers: z.string().optional().describe('Workspace member permission: "read", "write", or "none".'),
        expiresOn: z
            .number()
            .nullable()
            .optional()
            .describe('Unix epoch milliseconds after which the visitor link becomes invalid; null when it never expires.')
    })
    .describe('Visitor access settings for the mural.');

const MuralSchema = z
    .object({
        id: z.string().describe('Unique mural ID, a compound string of the form "{workspaceId}.{epoch-ms}". Example: "nangodev4776.1791984276717".'),
        title: z.string().describe('Title of the mural; an empty string when the mural is untitled.'),
        roomId: z.number().describe('ID of the room that contains the mural. Example: 1791984264781658.'),
        workspaceId: z.string().describe('ID of the workspace that contains the mural.'),
        status: z.enum(['active', 'archived']).describe('Whether the mural is currently "active" or "archived".'),
        favorite: z.boolean().optional().describe("When true, the mural is in the current user's favorites list."),
        createdOn: z.number().describe('Creation time as Unix epoch milliseconds. Example: 1791984276717.'),
        createdBy: UserBriefSchema.optional().describe('User who created the mural.'),
        updatedOn: z.number().describe('Last update time as Unix epoch milliseconds; equal to createdOn when the mural was never changed.'),
        updatedBy: UserBriefSchema.optional().describe('User who last updated the mural.'),
        sharingSettings: SharingSettingsSchema.optional().describe('Sharing settings for the mural.'),
        visitorsSettings: VisitorSettingsSchema.optional().describe('Visitor access settings for the mural.'),
        thumbnailUrl: z.string().optional().describe('URL of the latest thumbnail generated for the mural; points to a generic blank thumbnail by default.'),
        state: z.string().optional().describe('Opaque value used to authorize anonymous visitors.')
    })
    .describe('A mural in the workspace.');

const InputSchema = z
    .object({
        workspaceId: z.string().min(1).describe('ID of the workspace whose murals to list. Example: "nangodev4776".'),
        cursor: z.string().min(1).optional().describe('Pagination token returned as `nextCursor` by a previous call. Omit to fetch the first page.')
    })
    .describe('Input for listing the murals in a workspace.');

const OutputSchema = z
    .object({
        murals: z.array(MuralSchema).describe('Murals in the workspace on this page.'),
        nextCursor: z
            .string()
            .optional()
            .describe('Token to pass as `cursor` to fetch another page. It can still be returned on the final page, so stop when `murals` is empty.')
    })
    .describe('A page of murals in the workspace and the token needed to fetch the next page.');

const ProviderResponseSchema = z.object({
    next: z.string().optional(),
    value: z.array(MuralSchema)
});

/**
 * @tags: [read]
 * @tagReason: Lists murals from the provider and performs no mutation.
 * @pitfalls: Results are limited to murals the authenticated user owns or is a member of, not every mural in the workspace; a `nextCursor` can be returned even when no further murals exist, so page until `murals` is empty, and cursors expire.
 */
const action = createAction({
    description: 'List every mural across an entire workspace (all rooms).',
    version: '1.0.0',
    scopes: ['murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            limit: LIMIT
        };

        if (input.cursor !== undefined) {
            params['next'] = input.cursor;
        }

        const response = await nango.get({
            // https://developers.mural.co/public/reference/getworkspacemurals
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/murals`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const murals = parsed.value;
        const nextCursor = parsed.next;

        return {
            murals,
            ...(murals.length > 0 && nextCursor != null && nextCursor !== '' && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
