import { z } from 'zod';
import { createAction } from 'nango';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const InputSchema = z.object({
    id: z.number().int().positive().describe('Leave type ID. Example: 586883')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a leave type. Admin only.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://timetastic.co.uk/api/
        // DELETE /leavetypes/{id} returns 200 with an empty body on success;
        // failures (e.g. deleting the last active leave type) return 400 with { errorStatus, errorMessage }.
        try {
            await nango.delete({
                endpoint: `/leavetypes/${encodeURIComponent(String(input.id))}`,
                retries: 3
            });
        } catch (err: unknown) {
            const data = isRecord(err) && isRecord(err['response']) ? err['response']['data'] : undefined;
            const errorMessage = isRecord(data) && typeof data['errorMessage'] === 'string' ? data['errorMessage'] : undefined;
            throw new nango.ActionError({
                type: 'delete_failed',
                message: errorMessage ?? 'Failed to delete leave type',
                id: input.id
            });
        }

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
