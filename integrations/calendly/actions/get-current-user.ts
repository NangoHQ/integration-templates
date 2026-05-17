import { z } from 'zod';
import { createAction } from 'nango';

// https://developer.calendly.com/api-docs/3e88884a3e873-get-current-user
const ProviderUserSchema = z.object({
    resource: z.object({
        uri: z.string().describe('User URI. Example: "https://api.calendly.com/users/123"'),
        email: z.string().describe('User email. Example: "user@example.com"'),
        name: z.string().describe('User name. Example: "John Doe"'),
        slug: z.string().describe('User slug. Example: "john-doe"'),
        timezone: z.string().describe('User timezone. Example: "America/New_York"'),
        avatar_url: z.string().nullable().optional().describe('User avatar URL'),
        created_at: z.string().describe('User creation timestamp. Example: "2021-01-01T00:00:00Z"'),
        updated_at: z.string().describe('User update timestamp. Example: "2021-01-01T00:00:00Z"'),
        scheduling_url: z.string().describe('User scheduling URL. Example: "https://calendly.com/john-doe"'),
        current_organization: z.string().describe('Organization URI. Example: "https://api.calendly.com/organizations/123"')
    })
});

const OutputSchema = z.object({
    uri: z.string().describe('User URI'),
    email: z.string().describe('User email'),
    name: z.string().describe('User name'),
    slug: z.string().describe('User slug'),
    timezone: z.string().describe('User timezone'),
    avatar_url: z.string().optional().describe('User avatar URL'),
    created_at: z.string().describe('User creation timestamp'),
    updated_at: z.string().describe('User update timestamp'),
    scheduling_url: z.string().describe('User scheduling URL'),
    current_organization: z.string().describe('Organization URI')
});

const action = createAction({
    description: 'Fetch the authenticated Calendly user.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-current-user',
        group: 'Users'
    },
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/3e88884a3e873-get-current-user
        const response = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const providerData = ProviderUserSchema.parse(response.data);
        const user = providerData.resource;

        return {
            uri: user.uri,
            email: user.email,
            name: user.name,
            slug: user.slug,
            timezone: user.timezone,
            ...(user.avatar_url != null && { avatar_url: user.avatar_url }),
            created_at: user.created_at,
            updated_at: user.updated_at,
            scheduling_url: user.scheduling_url,
            current_organization: user.current_organization
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
