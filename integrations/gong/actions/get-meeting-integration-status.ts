import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emails: z.array(z.string().email()).max(100).describe('Array of user email addresses to check integration status for. Maximum 100.')
});

const UserIntegrationStatusSchema = z.object({
    email: z.string().describe('The email address of the meeting organizer.').nullable(),
    exists: z.boolean().describe('Whether the user exists in Gong.').nullable(),
    valid: z.boolean().describe('Whether the integration is connected for the user.').nullable(),
    userFacingError: z.string().nullish().describe('Message explaining why the integration is not connected.'),
    fixUrl: z.string().nullish().describe('A URL to place in the application to fix the problem.'),
    helpUrl: z.string().nullish().describe('A URL to the Gong help center with more information about the error.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string().describe('A Gong request reference ID for troubleshooting.'),
    users: z.array(UserIntegrationStatusSchema).describe('The integration status for each requested user.').nullable()
});

const OutputSchema = z.object({
    requestId: z.string().describe('A Gong request reference ID for troubleshooting.'),
    users: z.array(UserIntegrationStatusSchema).describe('The integration status for each requested user.').nullable()
});

const action = createAction({
    description: 'Validate the Gong meeting integration status.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:meetings:integration:status'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.gong.io/apidocs/validate-gong-meeting-integration-v2meetingsintegrationstatus
            endpoint: '/v2/meetings/integration/status',
            data: {
                emails: input.emails
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerResponse.requestId,
            users: providerResponse.users
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
