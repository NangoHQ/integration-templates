import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace that contains the source mural and the target room. Example: "nangodev4776"'),
        sourceMuralId: z.string().describe('ID of the mural to duplicate. Example: "nangodev4776.1791984276717"'),
        targetRoomName: z
            .string()
            .describe('Exact name of the room to duplicate the mural into. Reused if a room with this exact name exists, otherwise created.'),
        newTitle: z.string().describe('Title to give the duplicated mural. The source mural is left untouched.'),
        roomType: z.enum(['open', 'private']).optional().describe('Type of room to create when the target room does not exist. Defaults to "open".')
    })
    .describe('Input for duplicating a mural into a target room identified by name, creating the room first if it does not exist.');

const ProviderRoomSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ListRoomsResponseSchema = z.object({
    next: z.string().nullable().optional(),
    value: z.array(ProviderRoomSchema)
});

const CreateRoomResponseSchema = z.object({
    value: ProviderRoomSchema
});

const ProviderMuralSchema = z.object({
    id: z.string(),
    title: z.string(),
    roomId: z.number(),
    workspaceId: z.string(),
    createdOn: z.number(),
    updatedOn: z.number(),
    status: z.string(),
    infinite: z.boolean().optional(),
    backgroundColor: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    thumbnailUrl: z.string().optional(),
    folderId: z.string().optional()
});

const DuplicateMuralResponseSchema = z.object({
    value: ProviderMuralSchema
});

const DuplicatedMuralSchema = z.object({
    id: z.string().describe('ID of the duplicated mural. Example: "nangodev4776.1791984276717"'),
    title: z.string().describe('Title of the duplicated mural, matching the requested new title.'),
    roomId: z.number().describe('ID of the room that now contains the duplicated mural.'),
    workspaceId: z.string().describe('ID of the workspace that contains the duplicated mural.'),
    createdOn: z.number().describe('Creation time of the duplicated mural, in Unix epoch milliseconds.'),
    updatedOn: z.number().describe('Last update time of the duplicated mural, in Unix epoch milliseconds.'),
    status: z.string().describe('Status of the duplicated mural. Example: "active"'),
    infinite: z.boolean().optional().describe('Whether the duplicated mural canvas is borderless and grows as widgets are added.'),
    backgroundColor: z.string().optional().describe('Background color of the duplicated mural. Example: "#FAFAFAFF"'),
    height: z.number().optional().describe('Height of the duplicated mural in pixels.'),
    width: z.number().optional().describe('Width of the duplicated mural in pixels.'),
    thumbnailUrl: z.string().optional().describe('URL of the thumbnail generated for the duplicated mural.'),
    folderId: z.string().optional().describe('ID of the folder that contains the duplicated mural, when it is inside a folder.')
});

const OutputSchema = z
    .object({
        targetRoomId: z.number().describe('ID of the room that received the duplicated mural.'),
        roomWasCreated: z.boolean().describe('Whether a new room was created for this call (true) or an existing room was reused (false).'),
        duplicatedMural: DuplicatedMuralSchema.describe('The newly created copy of the source mural.')
    })
    .describe('Result of duplicating a mural, including the resolved target room and the duplicated mural.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the workspace rooms to find the target room, then creates the room when it is missing and writes a duplicated mural into it.
 * @pitfalls: A target room is reused only on an exact, case-sensitive name match and is otherwise created as an open room by default; a newly created room is not rolled back if the duplication fails, and confidential source murals cannot be duplicated.
 */
const action = createAction({
    description: 'Composite: duplicate an existing mural into a target room identified by name, creating that room first if it does not exist.',
    version: '1.0.0',
    scopes: ['rooms:read', 'rooms:write', 'murals:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const workspaceId = encodeURIComponent(input.workspaceId);
        let targetRoomId: number | undefined;
        let next: string | undefined;
        const seenCursors = new Set<string>();
        let searching = true;

        // Search every page: stopping early could miss an existing room and create a duplicate.
        while (searching) {
            const response = await nango.get({
                // https://developers.mural.co/public/reference/getworkspacerooms
                endpoint: `/api/public/v1/workspaces/${workspaceId}/rooms`,
                params: {
                    limit: 100,
                    ...(next !== undefined && { next })
                },
                retries: 3
            });

            const parsed = ListRoomsResponseSchema.parse(response.data);
            const match = parsed.value.find((room) => room.name === input.targetRoomName);

            if (match) {
                targetRoomId = match.id;
                searching = false;
            } else if (parsed.value.length === 0 || !parsed.next) {
                searching = false;
            } else if (seenCursors.has(parsed.next)) {
                // A repeated cursor means the scan cannot be proven complete; creating the room now
                // could duplicate one on an unread page, so fail instead.
                throw new nango.ActionError({
                    type: 'incomplete_room_search',
                    message: 'Mural returned a pagination cursor that was already used, so the room search could not finish.',
                    workspaceId: input.workspaceId
                });
            } else {
                seenCursors.add(parsed.next);
                next = parsed.next;
            }
        }

        let roomWasCreated = false;

        if (targetRoomId === undefined) {
            const createResponse = await nango.post({
                // https://developers.mural.co/public/reference/createroom
                endpoint: '/api/public/v1/rooms',
                data: {
                    name: input.targetRoomName,
                    type: input.roomType ?? 'open',
                    workspaceId: input.workspaceId
                },
                // Creating a room is not idempotent; a retry after a lost response would create a duplicate room.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });

            const created = CreateRoomResponseSchema.parse(createResponse.data);
            targetRoomId = created.value.id;
            roomWasCreated = true;
        }

        const duplicateResponse = await nango.post({
            // https://developers.mural.co/public/reference/duplicatemural
            endpoint: `/api/public/v1/murals/${encodeURIComponent(input.sourceMuralId)}/duplicate`,
            data: {
                roomId: targetRoomId,
                title: input.newTitle
            },
            // Duplicating a mural is not idempotent; a retry after a lost response would create a second copy.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const duplicated = DuplicateMuralResponseSchema.parse(duplicateResponse.data).value;

        return {
            targetRoomId,
            roomWasCreated,
            duplicatedMural: {
                id: duplicated.id,
                title: duplicated.title,
                roomId: duplicated.roomId,
                workspaceId: duplicated.workspaceId,
                createdOn: duplicated.createdOn,
                updatedOn: duplicated.updatedOn,
                status: duplicated.status,
                ...(duplicated.infinite !== undefined && { infinite: duplicated.infinite }),
                ...(duplicated.backgroundColor !== undefined && { backgroundColor: duplicated.backgroundColor }),
                ...(duplicated.height !== undefined && { height: duplicated.height }),
                ...(duplicated.width !== undefined && { width: duplicated.width }),
                ...(duplicated.thumbnailUrl !== undefined && { thumbnailUrl: duplicated.thumbnailUrl }),
                ...(duplicated.folderId !== undefined && { folderId: duplicated.folderId })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
