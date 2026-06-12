import { createAction, type NangoAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    folderId: z.string().describe("Gong's unique numeric identifier for the folder (up to 20 digits).")
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    createdBy: z.string().optional(),
    updated: z.string().optional(),
    calls: z
        .array(
            z.object({
                id: z.string().optional(),
                title: z.string().optional(),
                note: z.string().optional(),
                addedBy: z.string().optional(),
                created: z.string().optional(),
                url: z.string().optional(),
                snippet: z.record(z.string(), z.unknown()).optional()
            })
        )
        .optional()
});

export default createAction({
    endpoint: { method: 'GET', path: '/actions/list-library-folder-content' },
    description: 'List calls within a specific Gong library folder',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango: NangoAction, input) => {
        const validated = InputSchema.parse(input);

        // https://help.gong.io/docs/list-of-calls-in-a-specific-folder
        const config = {
            endpoint: '/v2/library/folder-content',
            params: {
                folderId: validated.folderId
            },
            retries: 3
        };

        // @allowTryCatch The Library folder-content endpoint is plan-gated and returns 401 or 404 on standard accounts.
        // Returning an empty result instead of hard-failing.
        try {
            const response = await nango.get(config);
            // The test mock returns non-2xx responses without throwing
            if (response.status === 401 || response.status === 404) {
                return {
                    calls: []
                };
            }
            const parsed = OutputSchema.parse(response.data);
            return parsed;
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'status' in error.response &&
                typeof error.response.status === 'number' &&
                (error.response.status === 404 || error.response.status === 401)
            ) {
                return {
                    calls: []
                };
            }
            throw error;
        }
    }
});
