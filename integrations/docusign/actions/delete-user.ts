import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID to close/remove. Example: "c9a996ed-50d2-4df4-ac91-a45032721bb6"')
});

const ProviderResponseSchema = z.object({
    users: z.array(z.object({}).passthrough()).optional()
});

const OutputSchema = z.object({
    users: z.array(z.object({}).passthrough()).optional()
});

const action = createAction({
    description: 'Close/remove users from the account.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();

        if (!metadata?.accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/users/deleteusers/
        const response = await nango.delete({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(metadata.accountId)}/users`,
            data: {
                users: [{ userId: input.userId }]
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.users !== undefined && { users: providerData.users })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
