import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        roomId: z.number().describe('Numeric ID of the room that contains the folder. Example: 1791984264781658'),
        folderId: z.string().describe('UUID of the folder to delete. Example: "b7300fcb-dc0b-4c01-9c83-18782b67bd58"')
    })
    .describe('Input for deleting a folder from a room.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the folder was successfully deleted.'),
        roomId: z.number().describe('Numeric ID of the room the folder was deleted from.'),
        folderId: z.string().describe('UUID of the deleted folder.')
    })
    .describe('Result of deleting a folder from a room.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a folder from a room through the provider API.
 * @pitfalls: Deleting a folder is permanent and irreversibly removes every sub-folder and mural it contains; Mural has no recycle bin or undo.
 */
const action = createAction({
    description: 'Delete a folder inside a room.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['rooms:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/deletefolderbyid
        await nango.delete({
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(String(input.roomId))}/folders/${encodeURIComponent(input.folderId)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- a retry after a lost success response would 404 on the already-deleted resource and report a completed delete as a failure.
            retries: 0
        });

        return {
            success: true,
            roomId: input.roomId,
            folderId: input.folderId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
