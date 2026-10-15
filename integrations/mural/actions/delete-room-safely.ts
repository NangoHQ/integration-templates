import { z } from 'zod';
import { createAction } from 'nango';

const MuralBriefSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    status: z.string().optional(),
    createdOn: z.number().optional(),
    updatedOn: z.number().optional(),
    roomId: z.number().optional(),
    workspaceId: z.string().optional()
});

const ProviderErrorSchema = z.object({
    response: z
        .object({
            status: z.number()
        })
        .optional()
});

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('Numeric ID of the room to delete. Example: 1791984264781658'),
        confirm: z.boolean().optional().describe('Set to true to delete the room even when it still contains murals. Defaults to false.')
    })
    .describe('Identifies the room to delete and whether to allow a cascading delete of its murals.');

const OutputSchema = z
    .object({
        deleted: z.boolean().describe('True when the room was deleted; false when the delete was blocked.'),
        blockedBy: z.string().optional().describe("Reason the delete was blocked. Present only when deleted is false; currently always 'has_murals'."),
        muralCount: z.number().int().describe('Number of murals found in the room at check time.'),
        muralIds: z.array(z.string()).describe('IDs of the murals found in the room at check time.'),
        cascadeDeletedMuralCount: z
            .number()
            .int()
            .optional()
            .describe('Number of murals permanently destroyed by the room delete cascade. Present only when deleted is true.')
    })
    .describe('Outcome of the safe room deletion, including the murals that were found or destroyed.');

function isNotFoundError(error: unknown): boolean {
    const parsed = ProviderErrorSchema.safeParse(error);
    return parsed.success && parsed.data.response?.status === 404;
}

/**
 * @tags: [read, write, destructive]
 * @tagReason: Lists the room's murals (read) before deleting the room (write), which permanently destroys the room and every mural inside it (destructive).
 * @pitfalls: Deleting a room is permanent and irreversibly destroys every mural it contains (no recycle bin or undo); confirm only blocks deletion when the room has murals, so an empty room is deleted even when confirm is omitted or false.
 */
const action = createAction({
    description: 'Safely delete a room, refusing to cascade-delete its murals unless explicitly confirmed.',
    version: '1.0.0',
    scopes: ['rooms:read', 'rooms:write', 'murals:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const roomId = encodeURIComponent(String(input.roomId));
        const muralIds: string[] = [];

        // https://developers.mural.co/public/reference/getroommurals
        const pages = nango.paginate<z.infer<typeof MuralBriefSchema>>({
            endpoint: `/api/public/v1/rooms/${roomId}/murals`,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'next',
                response_path: 'value',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        });

        for await (const page of pages) {
            const murals = z.array(MuralBriefSchema).parse(page);
            for (const mural of murals) {
                muralIds.push(mural.id);
            }
        }

        const muralCount = muralIds.length;
        const confirm = input.confirm === true;

        if (muralCount > 0 && !confirm) {
            return {
                deleted: false,
                blockedBy: 'has_murals',
                muralCount,
                muralIds
            };
        }

        // https://developers.mural.co/public/reference/deleteroombyid
        await nango.delete({
            endpoint: `/api/public/v1/rooms/${roomId}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- a retry after a lost success response would 404 on the already-deleted resource and report a completed delete as a failure.
            retries: 0
        });

        let confirmedDeleted = false;
        // @allowTryCatch: the follow-up GET is expected to 404 once the room is deleted and the proxy throws on non-2xx responses; this distinguishes "deleted" from "still present" instead of failing the action.
        try {
            // https://developers.mural.co/public/reference/getroominfobyid
            const verifyResponse = await nango.get({
                endpoint: `/api/public/v1/rooms/${roomId}`,
                retries: 3
            });
            confirmedDeleted = verifyResponse.status === 404;
        } catch (error) {
            confirmedDeleted = isNotFoundError(error);
        }

        if (!confirmedDeleted) {
            throw new nango.ActionError({
                type: 'delete_not_confirmed',
                message: 'The room delete request did not result in a 404 on the follow-up read.',
                roomId: input.roomId
            });
        }

        return {
            deleted: true,
            muralCount,
            muralIds,
            cascadeDeletedMuralCount: muralCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
