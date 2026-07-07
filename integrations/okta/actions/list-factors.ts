import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14u78lfuUpDWf0698"')
});

const FactorProfileSchema = z
    .object({
        credentialId: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().optional(),
        deviceType: z.string().optional(),
        name: z.string().optional(),
        platform: z.string().optional(),
        version: z.string().optional(),
        authenticatorName: z.string().optional()
    })
    .passthrough();

const FactorSchema = z
    .object({
        id: z.string().describe('Factor ID. Example: "ost14u7gbraSXvpXE698"'),
        factorType: z.string().describe('Factor type. Example: "token:software:totp"'),
        provider: z.string().describe('Factor provider. Example: "OKTA"'),
        status: z.string().describe('Factor status. Example: "ACTIVE"'),
        created: z.string().optional().describe('ISO 8601 creation timestamp'),
        lastUpdated: z.string().optional().describe('ISO 8601 last updated timestamp'),
        profile: FactorProfileSchema.optional()
    })
    .passthrough();

const OutputSchema = z.object({
    factors: z.array(FactorSchema)
});

const action = createAction({
    description: 'List enrolled factors for a user',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.factors.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/factors/#list-enrolled-factors
        const response = await nango.get({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/factors`,
            retries: 3
        });

        const parsed = z.array(FactorSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse factors response',
                details: parsed.error.issues
            });
        }

        return {
            factors: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
