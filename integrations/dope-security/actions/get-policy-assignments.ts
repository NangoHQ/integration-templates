import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"')
});

const AssignedUserSchema = z.object({
    email: z.string(),
    name: z.string()
});

const AssignedGroupSchema = z.object({
    email: z.string(),
    name: z.string(),
    membersCount: z.number()
});

const OutputSchema = z.object({
    data: z.object({
        users: z.array(AssignedUserSchema),
        groups: z.array(AssignedGroupSchema)
    })
});

const action = createAction({
    description: 'Fetch the users and groups a policy is assigned to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://inflight.dope.security/dope.apis/public-api-specification
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}/assignments`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerData = OutputSchema.parse(response.data);

        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
