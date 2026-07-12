import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().min(1).describe('First name of the user.'),
    lastName: z.string().min(1).describe('Last name of the user.'),
    email: z.string().email().describe('Email address of the user.'),
    login: z.string().min(1).optional().describe('Login username. Defaults to email if omitted.'),
    activate: z.boolean().optional().describe('Whether to activate the user immediately. Defaults to true.'),
    password: z.string().optional().describe('Initial password. If provided, the user is created ACTIVE with no welcome email.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    created: z.string().optional(),
    profile: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional(),
            login: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    login: z.string().optional(),
    createdAt: z.string().optional()
});

const action = createAction({
    description: 'Create a user.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            profile: {
                firstName: input.firstName,
                lastName: input.lastName,
                email: input.email,
                login: input.login ?? input.email
            }
        };

        if (input.password !== undefined) {
            body['credentials'] = {
                password: {
                    value: input.password
                }
            };
        }

        const activate = input.activate ?? true;

        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#create-user
            endpoint: '/api/v1/users',
            params: {
                activate: String(activate)
            },
            data: body,
            retries: 3
        });

        const providerUser = ProviderUserSchema.parse(response.data);

        return {
            id: providerUser.id,
            ...(providerUser.status !== undefined && { status: providerUser.status }),
            ...(providerUser.profile?.firstName !== undefined && { firstName: providerUser.profile.firstName }),
            ...(providerUser.profile?.lastName !== undefined && { lastName: providerUser.profile.lastName }),
            ...(providerUser.profile?.email !== undefined && { email: providerUser.profile.email }),
            ...(providerUser.profile?.login !== undefined && { login: providerUser.profile.login }),
            ...(providerUser.created !== undefined && { createdAt: providerUser.created })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
