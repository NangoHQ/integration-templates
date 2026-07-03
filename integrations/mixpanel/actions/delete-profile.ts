import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    distinct_id: z.string().describe('The distinct_id of the profile to delete. Example: "13793"'),
    project_token: z.string().describe('The Mixpanel project token. Example: "YOUR_PROJECT_TOKEN"'),
    ignore_alias: z.boolean().optional().describe('If true, prevents deleting the original profile when the distinct_id is an alias.'),
    region: z
        .string()
        .regex(/^[a-z0-9-]+$/, { message: 'Region must contain only lowercase letters, numbers, and hyphens.' })
        .optional()
        .describe('The Mixpanel data residency region. Defaults to "api" (US). Use "api-eu" for EU or "api-in" for India.')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Delete a profile',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const region = input.region || 'api';
        const baseUrl = `https://${region}.mixpanel.com`;

        const payload: Record<string, unknown> = {
            $token: input.project_token,
            $distinct_id: input.distinct_id,
            $delete: null
        };

        if (input.ignore_alias !== undefined) {
            payload['$ignore_alias'] = input.ignore_alias;
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/delete-profile
            endpoint: '/engage',
            params: {
                verbose: 1
            },
            data: [payload],
            retries: 0, // eslint-disable-line @nangohq/custom-integrations-linting/proxy-call-retries
            baseUrlOverride: baseUrl
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Mixpanel Engage API',
                response: response.data
            });
        }

        if (providerResponse.data.status !== 1) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: providerResponse.data.error || 'Profile deletion failed',
                distinct_id: input.distinct_id
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
