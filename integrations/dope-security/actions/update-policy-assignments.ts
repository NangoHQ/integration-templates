import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Name of the policy to update assignments for. Example: "RegistrySeedPolicy1"'),
    users: z.array(z.string()).optional().describe('User emails to assign. Omit to leave unchanged, send [] to unassign all.'),
    groups: z.array(z.string()).optional().describe('Group emails to assign. Omit to leave unchanged, send [] to unassign all.')
});

const ProviderAssignedUserSchema = z.object({
    email: z.string(),
    name: z.string()
});

const ProviderAssignedGroupSchema = z.object({
    email: z.string(),
    name: z.string(),
    membersCount: z.number()
});

const ProviderAssignmentsResponseSchema = z.object({
    data: z.object({
        users: z.array(ProviderAssignedUserSchema),
        groups: z.array(ProviderAssignedGroupSchema)
    })
});

const OutputSchema = z.object({
    policyName: z.string(),
    users: z.array(
        z.object({
            email: z.string(),
            name: z.string()
        })
    ),
    groups: z.array(
        z.object({
            email: z.string(),
            name: z.string(),
            membersCount: z.number()
        })
    )
});

const action = createAction({
    description: 'Update the users and groups a policy is assigned to (replaces lists; omit a list to preserve it).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedPolicyName = encodeURIComponent(input.policyName);

        const requestBody: {
            users?: string[];
            groups?: string[];
        } = {};

        if (input.users !== undefined) {
            requestBody.users = input.users;
        }

        if (input.groups !== undefined) {
            requestBody.groups = input.groups;
        }

        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.put({
            endpoint: `/v1/policies/${encodedPolicyName}/assignments`,
            data: requestBody,
            retries: 3
        });

        // https://inflight.dope.security/dope.apis/public-api-specification
        const response = await nango.get({
            endpoint: `/v1/policies/${encodedPolicyName}/assignments`,
            retries: 3
        });

        const parsed = ProviderAssignmentsResponseSchema.parse(response.data);

        return {
            policyName: input.policyName,
            users: parsed.data.users.map((user) => ({
                email: user.email,
                name: user.name
            })),
            groups: parsed.data.groups.map((group) => ({
                email: group.email,
                name: group.name,
                membersCount: group.membersCount
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
