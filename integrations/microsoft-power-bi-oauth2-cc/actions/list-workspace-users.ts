import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const PAGE_SIZE = 100;

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
            params: {
                $top: PAGE_SIZE
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                limit_name_in_request: '$top',
                limit: PAGE_SIZE,
                response_path: 'value'
            },
            retries: 3
        };

        const users: z.infer<typeof OutputSchema>['users'] = [];

        for await (const page of nango.paginate(config)) {
            for (const raw of page) {
                const parsed = ProviderUserSchema.parse(raw);
                users.push({
                    displayName: parsed.displayName,
                    emailAddress: parsed.emailAddress,
                    accessRight: parsed.groupUserAccessRight,
                    identifier: parsed.identifier,
                    principalType: parsed.principalType,
                    graphId: parsed.graphId,
                    userType: parsed.userType
                });
            }
        }

        return { users };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
