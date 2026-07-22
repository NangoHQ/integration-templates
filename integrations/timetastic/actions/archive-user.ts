import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('User ID. Example: 1523008'),
    archiveDate: z.string().describe("Archive date in the past, UTC. Example: '2026-01-01T00:00:00Z'")
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Archive a user, immediately logging them out and blocking further login.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        try {
            response = await nango.post({
                // https://help.timetastic.co.uk/en/articles/13193377-timetastic-api
                endpoint: `/users/archive/${encodeURIComponent(input.id)}`,
                data: {
                    archiveDate: input.archiveDate
                },
                retries: 3
            });
        } catch (err: unknown) {
            const data =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'data' in err.response
                    ? err.response.data
                    : undefined;
            const parsedError = z
                .object({
                    errorStatus: z.number().optional(),
                    errorMessage: z.string().nullable().optional()
                })
                .safeParse(data);
            throw new nango.ActionError({
                type: 'archive_failed',
                message: (parsedError.success && parsedError.data.errorMessage) || 'User could not be archived',
                ...(parsedError.success && parsedError.data.errorStatus !== undefined && { errorStatus: parsedError.data.errorStatus })
            });
        }

        let parsedData: unknown = response.data;
        if (typeof response.data === 'string' && response.data.trim().length > 0) {
            // @allowTryCatch Safely attempt to parse a string response body as JSON.
            // If parsing fails, fall back to wrapping the raw string so the action does not crash on non-JSON payloads.
            try {
                parsedData = JSON.parse(response.data);
            } catch {
                parsedData = { raw: response.data };
            }
        }

        const providerResponse = z
            .object({
                errorStatus: z.number().optional(),
                errorMessage: z.string().nullable().optional()
            })
            .safeParse(parsedData);

        if (providerResponse.success && providerResponse.data.errorStatus !== undefined) {
            const success = providerResponse.data.errorStatus === 0;

            if (!success) {
                throw new nango.ActionError({
                    type: 'archive_failed',
                    message: providerResponse.data.errorMessage || 'User could not be archived',
                    errorStatus: providerResponse.data.errorStatus
                });
            }

            return {
                success: true,
                ...(providerResponse.data.errorMessage != null && { message: providerResponse.data.errorMessage })
            };
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
