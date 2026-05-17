import { z } from 'zod';
import { createAction } from 'nango';

const UserMeSchema = z.object({
    resource: z.object({
        uri: z.string(),
        current_organization: z.string()
    })
});

const InvitationResponseSchema = z.object({
    resource: z.object({
        uri: z.string(),
        email: z.string(),
        status: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        organization: z.string()
    })
});

const InputSchema = z.object({
    email: z.string().email().describe('Email address of the user to invite')
});

const OutputSchema = z.object({
    id: z.string().describe('Invitation UUID'),
    email: z.string().describe('Email of the invited user'),
    firstName: z.string().describe('First name (empty for pending invitations)'),
    lastName: z.string().describe('Last name (empty for pending invitations)')
});

const action = createAction({
    description: 'Invite a user to the Calendly organization.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.calendly.com/api-docs/3e88884a3e873-get-current-user
        const userResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const parsedUser = UserMeSchema.parse(userResponse.data);
        const orgUri = parsedUser.resource.current_organization;
        const orgUuid = orgUri.split('/').pop();

        if (!orgUuid) {
            throw new Error('Failed to extract organization UUID from URI');
        }

        // https://developer.calendly.com/api-docs/4d8e2a937ba9e-invite-user-to-organization
        const inviteResponse = await nango.post({
            endpoint: `/organizations/${orgUuid}/invitations`,
            data: { email: input.email },
            retries: 3
        });

        const parsed = InvitationResponseSchema.parse(inviteResponse.data);
        const id = parsed.resource.uri.split('/').pop() || parsed.resource.uri;

        return {
            id,
            email: parsed.resource.email,
            firstName: '',
            lastName: ''
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
