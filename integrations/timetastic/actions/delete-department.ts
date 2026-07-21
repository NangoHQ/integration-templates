import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const InputSchema = z.object({
    id: z.number().int().positive().describe('Department ID to delete. Example: 248822')
});

const OutputSchema = z.object({
    id: z.number(),
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a department.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://timetastic.co.uk/api/
            endpoint: `/departments/delete/${encodeURIComponent(String(input.id))}`,
            data: {},
            retries: 3
        };

        // Failures (e.g. deleting a department with users, or lacking permission) return 400
        // with a numeric { errorStatus, errorMessage } body.
        try {
            await nango.post(config);
        } catch (err: unknown) {
            const data = isRecord(err) && isRecord(err['response']) ? err['response']['data'] : undefined;
            const errorMessage = isRecord(data) && typeof data['errorMessage'] === 'string' ? data['errorMessage'] : undefined;
            throw new nango.ActionError({
                type: 'delete_failed',
                message: errorMessage ?? 'Failed to delete department',
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
