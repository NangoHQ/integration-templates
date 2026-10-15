import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MURAL_PAGE_LIMIT = 100;

// Internal schemas used only to parse provider responses; not part of the public model.
const ProviderMuralUserSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional()
});

const ProviderMuralSchema = z.object({
    id: z.string(),
    workspaceId: z.string(),
    title: z.string(),
    roomId: z.number().nullable().optional(),
    status: z.string(),
    state: z.string().optional(),
    favorite: z.boolean().optional(),
    infinite: z.boolean().optional(),
    createdOn: z.number(),
    updatedOn: z.number().optional(),
    createdBy: ProviderMuralUserSchema.optional(),
    updatedBy: ProviderMuralUserSchema.optional(),
    sharingSettings: z
        .object({
            link: z.string().optional()
        })
        .optional(),
    visitorsSettings: z
        .object({
            link: z.string().optional(),
            visitors: z.string().optional(),
            workspaceMembers: z.string().optional()
        })
        .optional(),
    thumbnailUrl: z.string().optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string()
});

const ProviderWorkspacesResponseSchema = z.object({
    value: z.array(ProviderWorkspaceSchema)
});

const MuralUserSchema = z
    .object({
        id: z.string().describe('Unique identifier of the Mural user. Example: "u6ed91a0eb0c5cb4ae8713013".'),
        firstName: z.string().optional().describe('First name of the user, when set.'),
        lastName: z.string().optional().describe('Last name of the user, when set.')
    })
    .describe('Reference to a Mural user, such as the creator or last editor of a mural.');

const MuralSharingSettingsSchema = z
    .object({
        link: z.string().optional().describe('Shareable invitation link for the mural, when link sharing is enabled.')
    })
    .describe('Sharing settings for a mural.');

const MuralVisitorsSettingsSchema = z
    .object({
        link: z.string().optional().describe('Visitor link for the mural.'),
        visitors: z.string().optional().describe('Access level granted to visitors, for example "none".'),
        workspaceMembers: z.string().optional().describe('Access level granted to workspace members, for example "write" or "read".')
    })
    .describe('Visitor and workspace-member access settings for a mural.');

const MuralSchema = z
    .object({
        id: z.string().describe('Unique mural identifier, formatted as `${workspaceId}.${epochMilliseconds}`. Example: "nangodev4776.1791984276717".'),
        workspaceId: z.string().describe('Identifier of the workspace the mural belongs to. Example: "nangodev4776".'),
        title: z.string().describe('Mural title; an empty string when the mural is untitled.'),
        roomId: z.number().nullable().optional().describe('Identifier of the room containing the mural, or null when the mural is not inside a room.'),
        status: z.string().describe('Mural lifecycle status, for example "active".'),
        state: z.string().optional().describe('Opaque hash of the current mural canvas state; changes whenever the mural content changes.'),
        favorite: z.boolean().optional().describe('Whether the current user has marked the mural as a favorite.'),
        infinite: z.boolean().optional().describe('Whether the mural uses an infinite canvas.'),
        createdOn: z.string().describe('Mural creation timestamp in ISO 8601 format, converted from the provider epoch-milliseconds value.'),
        updatedOn: z.string().optional().describe('Last modification timestamp in ISO 8601 format, converted from the provider epoch-milliseconds value.'),
        createdBy: MuralUserSchema.optional().describe('User who created the mural.'),
        updatedBy: MuralUserSchema.optional().describe('User who last modified the mural.'),
        sharingSettings: MuralSharingSettingsSchema.optional().describe('Sharing settings for the mural.'),
        visitorsSettings: MuralVisitorsSettingsSchema.optional().describe('Visitor and workspace-member access settings for the mural.'),
        thumbnailUrl: z.string().optional().describe('URL of the mural thumbnail image.')
    })
    .describe('A Mural mural (a collaborative canvas) with its room, status, sharing and visitor settings, and timestamps.');

type ProviderMural = z.infer<typeof ProviderMuralSchema>;
type ProviderMuralUser = z.infer<typeof ProviderMuralUserSchema>;

function normalizeUser(user: ProviderMuralUser) {
    return {
        id: user.id,
        ...(user.firstName != null && { firstName: user.firstName }),
        ...(user.lastName != null && { lastName: user.lastName })
    };
}

function normalizeMural(mural: ProviderMural) {
    return {
        id: mural.id,
        workspaceId: mural.workspaceId,
        title: mural.title,
        ...(mural.roomId !== undefined && { roomId: mural.roomId }),
        status: mural.status,
        ...(mural.state !== undefined && { state: mural.state }),
        ...(mural.favorite !== undefined && { favorite: mural.favorite }),
        ...(mural.infinite !== undefined && { infinite: mural.infinite }),
        createdOn: new Date(mural.createdOn).toISOString(),
        ...(mural.updatedOn !== undefined && { updatedOn: new Date(mural.updatedOn).toISOString() }),
        ...(mural.createdBy != null && { createdBy: normalizeUser(mural.createdBy) }),
        ...(mural.updatedBy != null && { updatedBy: normalizeUser(mural.updatedBy) }),
        ...(mural.sharingSettings !== undefined && { sharingSettings: mural.sharingSettings }),
        ...(mural.visitorsSettings !== undefined && { visitorsSettings: mural.visitorsSettings }),
        ...(mural.thumbnailUrl !== undefined && { thumbnailUrl: mural.thumbnailUrl })
    };
}

const sync = createSync({
    description: 'Sync every mural in the workspace (title, room, status, sharing/visitor settings, timestamps).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Mural: MuralSchema
    },

    exec: async (nango) => {
        // Mural public API - List workspaces: https://developers.mural.co/public/reference
        const workspacesResponse = await nango.get({
            endpoint: '/api/public/v1/workspaces',
            retries: 3
        });

        const workspaces = ProviderWorkspacesResponseSchema.parse(workspacesResponse.data).value;
        if (workspaces.length === 0) {
            throw new Error('No Mural workspace is available for this connection.');
        }

        // Full refresh with delete detection. GET /workspaces/{workspaceId}/murals has no
        // changed-since filter and no deleted-record feed (an unrecognized `updatedOn` query
        // parameter is rejected with a 400), so every run re-walks the full listing and relies on
        // trackDeletesStart/trackDeletesEnd to remove murals that disappeared. There is no
        // resumable checkpoint: the opaque `next` cursor is still present on a full last page, so
        // token presence alone cannot signal the end; nango.paginate stops on an absent cursor or
        // an empty `value` array. Resuming a delete-tracked scan mid-run would risk falsely
        // deleting records that were not re-seen yet.
        await nango.trackDeletesStart('Mural');

        for (const workspace of workspaces) {
            const proxyConfig: ProxyConfiguration = {
                // Mural public API - List murals in a workspace: https://developers.mural.co/public/reference
                endpoint: `/api/public/v1/workspaces/${encodeURIComponent(workspace.id)}/murals`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'next',
                    cursor_path_in_response: 'next',
                    response_path: 'value',
                    limit_name_in_request: 'limit',
                    limit: MURAL_PAGE_LIMIT
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                // Throw on parse failure: silently skipping a malformed record inside a
                // delete-tracked scan would falsely mark it as deleted.
                const murals = z.array(ProviderMuralSchema).parse(page);

                if (murals.length === 0) {
                    continue;
                }

                await nango.batchSave(murals.map(normalizeMural), 'Mural');
            }
        }

        await nango.trackDeletesEnd('Mural');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
