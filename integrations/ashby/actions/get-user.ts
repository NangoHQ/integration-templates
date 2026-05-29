import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The id to lookup the user. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.string(),
    managerId: z.string().optional(),
    customFields: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().optional(),
    globalRole: z.string(),
    isEnabled: z.boolean(),
    updatedAt: z.string(),
    managerId: z.string().optional(),
    customFields: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single user from Ashby.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizationRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/userinfo
            endpoint: 'user.info',
            data: {
                userId: input.userId
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid or empty response from Ashby API.'
            });
        }

        if ('success' in raw && raw.success === false) {
            const errorMessage = 'errors' in raw && Array.isArray(raw.errors) && raw.errors.length > 0 ? String(raw.errors[0]) : 'Ashby API returned an error.';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage
            });
        }

        if (!('results' in raw) || raw.results === null || raw.results === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `User with id ${input.userId} not found.`
            });
        }

        const providerUser = ProviderUserSchema.parse(raw.results);

        return {
            id: providerUser.id,
            firstName: providerUser.firstName,
            lastName: providerUser.lastName,
            globalRole: providerUser.globalRole,
            isEnabled: providerUser.isEnabled,
            updatedAt: providerUser.updatedAt,
            ...(providerUser.email !== undefined && { email: providerUser.email }),
            ...(providerUser.managerId !== undefined && { managerId: providerUser.managerId }),
            ...(providerUser.customFields !== undefined && { customFields: providerUser.customFields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
