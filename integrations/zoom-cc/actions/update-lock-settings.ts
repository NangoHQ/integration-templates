import { z } from 'zod';
import { createAction } from 'nango';

const LockSettingsCategorySchema = z.object({}).passthrough();

const LockSettingsSchema = z
    .object({
        schedule_meeting: LockSettingsCategorySchema.optional(),
        in_meeting: LockSettingsCategorySchema.optional(),
        email_notification: LockSettingsCategorySchema.optional(),
        recording: LockSettingsCategorySchema.optional(),
        telephony: LockSettingsCategorySchema.optional(),
        feature: LockSettingsCategorySchema.optional(),
        security: LockSettingsCategorySchema.optional(),
        tsp: LockSettingsCategorySchema.optional()
    })
    .passthrough();

const InputSchema = LockSettingsSchema;

const OutputSchema = LockSettingsSchema.or(
    z.object({
        code: z.number(),
        message: z.string()
    })
);

function matchesPlanTierPayload(payload: unknown): boolean {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload &&
        payload.code === 200 &&
        'message' in payload &&
        typeof payload.message === 'string' &&
        payload.message.includes('Only available for Paid account')
    );
}

const action = createAction({
    description: 'Update account-wide locked settings.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['account:update:lock_settings:admin', 'account:update:lock_settings:master'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch Zoom returns HTTP 400 with the documented "Only available for Paid account"
        // payload for Free-tier accounts. We recover from that documented case only; any other
        // rejected request is rethrown so callers/retries can detect the real failure.
        try {
            // https://developers.zoom.us/docs/api/accounts/
            response = await nango.patch({
                endpoint: '/v2/accounts/me/lock_settings',
                data: input,
                retries: 3
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null) {
                if ('response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response) {
                    if (matchesPlanTierPayload(err.response.data)) {
                        return OutputSchema.parse(err.response.data);
                    }
                } else if ('status' in err && err.status === 400 && 'payload' in err && matchesPlanTierPayload(err.payload)) {
                    return OutputSchema.parse(err.payload);
                }
            }
            throw err;
        }

        if (response.status === 400) {
            if (matchesPlanTierPayload(response.data)) {
                return OutputSchema.parse(response.data);
            }
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Zoom API returned an unexpected 400 error.',
                details: response.data
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
