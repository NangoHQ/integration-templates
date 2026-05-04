import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the new user. Example: "john.doe@example.com"'),
    firstName: z.string().describe('First name of the new user. Example: "John"'),
    lastName: z.string().describe('Last name of the new user. Example: "Doe"')
});

const OutputSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
});

const DropboxMemberSchema = z.object({
    profile: z.object({
        account_id: z.string(),
        email: z.string(),
        name: z.object({
            given_name: z.string(),
            surname: z.string()
        })
    })
});

const DropboxAddMembersResponseSchema = z.object({
    complete: z.array(DropboxMemberSchema)
});

const action = createAction({
    description: 'Creates a user in Dropbox. Requires Dropbox Business.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/users',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['members.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-add
        const response = await nango.post({
            endpoint: '/2/team/members/add_v2',
            data: {
                new_members: [
                    {
                        member_email: input.email,
                        member_given_name: input.firstName,
                        member_surname: input.lastName
                    }
                ]
            },
            retries: 3
        });

        const { complete } = DropboxAddMembersResponseSchema.parse(response.data);
        const [member] = complete;

        if (!member) {
            throw new nango.ActionError({
                message: 'Failed to create user'
            });
        }

        return {
            id: member.profile.account_id,
            firstName: member.profile.name.given_name,
            lastName: member.profile.name.surname,
            email: member.profile.email
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
