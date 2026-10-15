import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PAGE_LIMIT = 100;

const ProviderUserSchema = z.object({
    id: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const ProviderRoomSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    confidential: z.boolean().nullable().optional(),
    isMember: z.boolean().nullable().optional(),
    favorite: z.boolean().nullable().optional(),
    createdOn: z.number().nullable().optional(),
    updatedOn: z.number().nullable().optional(),
    workspaceId: z.string().nullable().optional(),
    createdBy: ProviderUserSchema.nullable().optional(),
    updatedBy: ProviderUserSchema.nullable().optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string()
});

const RoomUserSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the user. Example: "u6ed91a0eb0c5cb4ae8713013".'),
        firstName: z.string().optional().describe('First name of the user.'),
        lastName: z.string().optional().describe('Last name of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        type: z.string().optional().describe('User type, for example "member" or "guest".')
    })
    .describe('A Mural user reference attached to a room.');

const RoomSchema = z
    .object({
        id: z.string().describe('Unique numeric identifier of the room, serialized as a string. Example: "1791984264781658".'),
        name: z.string().optional().describe('Name of the room.'),
        type: z.string().optional().describe('Room type: "open" (anyone can join) or "private".'),
        description: z.string().optional().describe('Description of the room.'),
        confidential: z.boolean().optional().describe('When true, the room is confidential and cannot generate a share link (enterprise feature).'),
        isMember: z.boolean().optional().describe('When true, the authenticated user is a member of the room.'),
        favorite: z.boolean().optional().describe('When true, the authenticated user has marked the room as a favorite.'),
        createdOn: z.number().optional().describe('Unix epoch milliseconds when the room was created. Example: 1791984264781.'),
        updatedOn: z.number().optional().describe('Unix epoch milliseconds when the room was last updated. Example: 1791984264781.'),
        workspaceId: z.string().optional().describe('Unique identifier of the workspace the room belongs to. Example: "nangodev4776".'),
        createdBy: RoomUserSchema.optional().describe('Information about the user who created the room.'),
        updatedBy: RoomUserSchema.optional().describe('Information about the user who last updated the room.')
    })
    .describe('A room in a Mural workspace.');

function mapUser(raw: z.infer<typeof ProviderUserSchema> | null | undefined): z.infer<typeof RoomUserSchema> | undefined {
    if (raw == null) {
        return undefined;
    }
    return {
        ...(raw.id != null && { id: raw.id }),
        ...(raw.firstName != null && { firstName: raw.firstName }),
        ...(raw.lastName != null && { lastName: raw.lastName }),
        ...(raw.email != null && { email: raw.email }),
        ...(raw.type != null && { type: raw.type })
    };
}

function mapRoom(raw: z.infer<typeof ProviderRoomSchema>): z.infer<typeof RoomSchema> {
    const createdBy = mapUser(raw.createdBy);
    const updatedBy = mapUser(raw.updatedBy);
    return {
        id: String(raw.id),
        ...(raw.name != null && { name: raw.name }),
        ...(raw.type != null && { type: raw.type }),
        ...(raw.description != null && { description: raw.description }),
        ...(raw.confidential != null && { confidential: raw.confidential }),
        ...(raw.isMember != null && { isMember: raw.isMember }),
        ...(raw.favorite != null && { favorite: raw.favorite }),
        ...(raw.createdOn != null && { createdOn: raw.createdOn }),
        ...(raw.updatedOn != null && { updatedOn: raw.updatedOn }),
        ...(raw.workspaceId != null && { workspaceId: raw.workspaceId }),
        ...(createdBy !== undefined && { createdBy }),
        ...(updatedBy !== undefined && { updatedBy })
    };
}

const sync = createSync({
    description: 'Sync every room in every accessible Mural workspace.',
    version: '1.0.0',
    scopes: ['workspaces:read', 'rooms:read'],
    frequency: 'every hour',
    autoStart: true,
    models: {
        Room: RoomSchema
    },

    exec: async (nango) => {
        // Mural exposes no updated-since filter on its rooms endpoint (unrecognized query
        // params are rejected with 400 QUERY), so this is always a full refresh and relies on
        // delete tracking to drop rooms that were removed since the previous run.
        // Mural returns a `next` token even on the last page; nango.paginate stops on an
        // absent cursor or an empty `value` array.
        const workspaces: z.infer<typeof ProviderWorkspaceSchema>[] = [];
        const workspacesConfig: ProxyConfiguration = {
            // https://developers.mural.co/public/reference/getworkspaces
            endpoint: '/api/public/v1/workspaces',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'next',
                cursor_path_in_response: 'next',
                response_path: 'value',
                limit_name_in_request: 'limit',
                limit: PAGE_LIMIT
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(workspacesConfig)) {
            workspaces.push(...z.array(ProviderWorkspaceSchema).parse(page));
        }

        // An empty workspace list (lost access, transient provider issue) would otherwise
        // complete a zero-room delete scan and remove every previously synced room.
        if (workspaces.length === 0) {
            throw new Error('No Mural workspace is available for this connection.');
        }

        // Open delete tracking only after the prerequisite workspace list is resolved, so a
        // failure before this point never leaves a delete window open without a matching end.
        await nango.trackDeletesStart('Room');

        for (const workspace of workspaces) {
            const roomsConfig: ProxyConfiguration = {
                // https://developers.mural.co/public/reference/getworkspacerooms
                endpoint: `/api/public/v1/workspaces/${encodeURIComponent(workspace.id)}/rooms`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'next',
                    cursor_path_in_response: 'next',
                    response_path: 'value',
                    limit_name_in_request: 'limit',
                    limit: PAGE_LIMIT
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(roomsConfig)) {
                // Throw on parse failure: silently skipping a malformed record inside a
                // delete-tracked scan would falsely mark it as deleted.
                const rooms = z.array(ProviderRoomSchema).parse(page);
                if (rooms.length > 0) {
                    await nango.batchSave(rooms.map(mapRoom), 'Room');
                }
            }
        }

        await nango.trackDeletesEnd('Room');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
