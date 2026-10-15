import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace that owns the room. Example: "workspace1234".'),
        roomName: z.string().describe('Exact name of the room to reuse, or to create if no room with this exact name exists.'),
        muralTitle: z.string().describe('Title to assign to the newly created mural.')
    })
    .describe('Identifies the workspace and room to place the mural in, and the title of the mural to create.');

const RoomSchema = z.object({
    id: z.number(),
    name: z.string()
});

const RoomsPageSchema = z.object({
    value: z.array(RoomSchema),
    next: z.string().nullable().optional()
});

const CreateRoomResponseSchema = z.object({
    value: z.object({
        id: z.number()
    })
});

const MuralSchema = z.object({
    id: z.string().describe('Unique ID of the created mural. Example: "workspace1234.1608152669000".'),
    title: z.string().describe('Title of the created mural.'),
    roomId: z.number().describe('ID of the room that contains the mural.'),
    workspaceId: z.string().describe('ID of the workspace that contains the mural.'),
    status: z.string().describe('Whether the mural is "active" or "archived".'),
    createdOn: z.number().describe('Creation timestamp in Unix epoch milliseconds.'),
    updatedOn: z.number().describe('Last update timestamp in Unix epoch milliseconds.')
});

const CreateMuralResponseSchema = z.object({
    value: MuralSchema
});

const OutputSchema = z
    .object({
        roomId: z.number().describe('ID of the room the mural was created in.'),
        roomWasCreated: z.boolean().describe('True when this action created the room, false when an existing room was reused.'),
        mural: MuralSchema.describe('The newly created mural.')
    })
    .describe('The resolved room and the mural created inside it.');

/**
 * @tags: [read, write]
 * @tagReason: Lists workspace rooms to find an exact-name match, then creates the room and mural when needed.
 * @pitfalls: Room matching is exact and case-sensitive, so a room differing only in letter case or surrounding whitespace is not reused and a duplicate is created; only rooms the connection can read are searched, so a same-named room it cannot see is also missed, and a newly created room is always of type "open" (any workspace member may join).
 */
const action = createAction({
    description: 'Find a room by exact name in a workspace (creating it if missing), then create a mural inside it.',
    version: '1.0.0',
    scopes: ['rooms:read', 'rooms:write', 'murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let nextToken: string | undefined = undefined;
        let roomId: number | undefined = undefined;
        const seenCursors = new Set<string>();
        let searching = true;

        while (searching) {
            const params: Record<string, string | number> = { limit: 100 };
            if (nextToken !== undefined) {
                params['next'] = nextToken;
            }

            // https://developers.mural.co/public/reference/getworkspacerooms
            const roomsResponse = await nango.get({
                endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/rooms`,
                params,
                retries: 3
            });

            const page = RoomsPageSchema.parse(roomsResponse.data);
            const match = page.value.find((room) => room.name === input.roomName);
            if (match !== undefined) {
                roomId = match.id;
                searching = false;
            } else if (page.value.length === 0 || page.next == null) {
                searching = false;
            } else if (seenCursors.has(page.next)) {
                // A repeated cursor means the scan cannot be proven complete; creating the room now
                // could duplicate one on an unread page, so fail instead.
                throw new nango.ActionError({
                    type: 'incomplete_room_search',
                    message: 'Mural returned a pagination cursor that was already used, so the room search could not finish.',
                    workspaceId: input.workspaceId
                });
            } else {
                seenCursors.add(page.next);
                nextToken = page.next;
            }
        }

        let roomWasCreated = false;

        if (roomId === undefined) {
            // https://developers.mural.co/public/reference/createroom
            const createRoomResponse = await nango.post({
                endpoint: '/api/public/v1/rooms',
                data: {
                    name: input.roomName,
                    type: 'open',
                    workspaceId: input.workspaceId
                },
                // Not idempotent: a retry after a lost response would create a duplicate room.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
            roomId = CreateRoomResponseSchema.parse(createRoomResponse.data).value.id;
            roomWasCreated = true;
        }

        // https://developers.mural.co/public/reference/createmural
        const createMuralResponse = await nango.post({
            endpoint: '/api/public/v1/murals',
            data: {
                roomId,
                title: input.muralTitle,
                workspaceId: input.workspaceId
            },
            // Not idempotent: a retry after a lost response would create a duplicate mural.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });
        const mural = CreateMuralResponseSchema.parse(createMuralResponse.data).value;

        return {
            roomId,
            roomWasCreated,
            mural
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
