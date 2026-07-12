import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Okta user ID. Example: "00u14u78lfuUpDWf0698"'),
    factorId: z.string().describe('Enrolled factor ID. Example: "ost14u7gbraSXvpXE698"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        factorType: z.string(),
        provider: z.string(),
        status: z.string(),
        created: z.string().optional(),
        lastUpdated: z.string().optional(),
        profile: z.record(z.string(), z.unknown()).optional(),
        _links: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single enrolled factor for a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.factors.read'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developer.okta.com/docs/reference/api/factors/
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/factors/${encodeURIComponent(input.factorId)}`,
            retries: 3
        });

        const providerFactor = OutputSchema.parse(response.data);

        return providerFactor;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
