import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        roomId: z.number().int().positive().describe('Numeric ID of the room to permanently delete. Example: 1791984264781658')
    })
    .describe('Input for permanently deleting a room and every mural it currently contains.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when the room was permanently deleted.')
    })
    .describe('Result of the room deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a room from the workspace, which also destroys every mural it currently contains.
 * @pitfalls: Deletion is immediate and permanent with no recycle bin or restore path, and it also permanently destroys every mural still inside the room at delete time; only a room owner can delete it.
 */
const action = createAction({
    description: 'Permanently delete a room and every mural it currently contains.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/deleteroombyid
        await nango.delete({
            endpoint: `/api/public/v1/rooms/${encodeURIComponent(String(input.roomId))}`,
            retries: 3
        });

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
