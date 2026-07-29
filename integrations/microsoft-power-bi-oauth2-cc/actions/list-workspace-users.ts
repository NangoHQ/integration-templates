import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('The workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const ProviderUserSchema = z.object({
    displayName: z.string().optional(),
    emailAddress: z.string().optional(),
    groupUserAccessRight: z.string(),
    identifier: z.string(),
    principalType: z.string(),
    graphId: z.string().optional(),
    userType: z.string().optional()
});

const OutputSchema = z.object({
    users: z.array(
        z.object({
            displayName: z.string().optional(),
            emailAddress: z.string().optional(),
            accessRight: z.string(),
            identifier: z.string(),
            principalType: z.string(),
            graphId: z.string().optional(),
            userType: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List users and service principals with access to a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Workspace.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-group-users
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/users`,
            retries: 3
        };

        const response = await nango.get(config);

        const responseData = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const users = responseData.value.map((raw) => {
            const parsed = ProviderUserSchema.parse(raw);
            return {
                displayName: parsed.displayName,
                emailAddress: parsed.emailAddress,
                accessRight: parsed.groupUserAccessRight,
                identifier: parsed.identifier,
                principalType: parsed.principalType,
                graphId: parsed.graphId,
                userType: parsed.userType
            };
        });

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
