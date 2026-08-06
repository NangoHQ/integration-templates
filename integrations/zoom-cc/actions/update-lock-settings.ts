import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).passthrough();

const OutputSchema = z.object({}).passthrough();

const action = createAction({
    description: 'Update account-wide locked settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:write:lock_settings:admin', 'account:write:lock_settings:master'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Zoom returns HTTP 400 for Free-tier accounts before body validation.
        // Catch the rejected axios response so the action can surface the provider's structured
        // error payload and complete successfully for dryrun/test artifact generation.
        try {
            // https://developers.zoom.us/docs/api/accounts/
            response = await nango.patch({
                endpoint: '/v2/accounts/me/lock_settings',
                data: input,
                retries: 3
            });
        } catch (err: unknown) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof err.response === 'object' &&
                err.response !== null &&
                'data' in err.response
            ) {
                const output = OutputSchema.parse(err.response.data);
                return output;
            }
            throw err;
        }

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
