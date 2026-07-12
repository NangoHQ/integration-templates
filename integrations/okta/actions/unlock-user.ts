import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The unique ID of the user to unlock. Example: "00u14y9f9k4hf71lc698"')
});

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Unlock a user with a LOCKED_OUT status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#unlock-user
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/lifecycle/unlock`,
            retries: 10
        });

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Okta unlock endpoint',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
