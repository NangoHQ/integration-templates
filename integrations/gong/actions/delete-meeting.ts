import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meetingId: z.string().describe('Gong\'s unique identifier for the meeting (up to 20 digits). Example: "12345678901234567890"'),
    organizerEmail: z.string().email().describe('The email address of the user who created the meeting. Example: "api@nango.dev"')
});

const ProviderResponseSchema = z.object({
    organizerEmail: z.string().nullish()
});

const OutputSchema = z.object({
    organizerEmail: z.string().nullish()
});

const action = createAction({
    description: 'Delete a Gong meeting (Beta).',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:meetings:user:delete'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        try {
            // https://help.gong.io/docs/what-the-gong-api-provides
            response = await nango.delete({
                endpoint: `/v2/meetings/${encodeURIComponent(input.meetingId)}`,
                data: {
                    organizerEmail: input.organizerEmail
                },
                retries: 3
            });
        } catch (error: unknown) {
            // @allowTryCatch - The Gong Meetings API returns 404 when the meeting does not exist.
            // Treating 404 as success makes the delete action idempotent.
            const status = error !== null && typeof error === 'object' && 'status' in error && typeof error.status === 'number' ? error.status : undefined;
            if (status === 404) {
                return {
                    organizerEmail: input.organizerEmail
                };
            }
            throw error;
        }

        if (response.status === 404) {
            return {
                organizerEmail: input.organizerEmail
            };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.organizerEmail !== undefined && { organizerEmail: providerResponse.organizerEmail })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
