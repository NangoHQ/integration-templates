import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of agents to return per page. Defaults to 50.')
});

const AgentSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    emailId: z.string().optional(),
    status: z.string().optional(),
    roleId: z.string().optional(),
    rolePermissionType: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    profileId: z.string().optional(),
    associatedDepartmentIds: z.array(z.string()).optional(),
    photoURL: z.string().optional(),
    zuid: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AgentSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List agents.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-agents',
        group: 'Agents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const extension = connection.connection_config?.['extension'];
        const baseUrlOverride = extension ? `https://desk.zoho.${extension}` : undefined;

        const from = input.cursor ? parseInt(input.cursor, 10) : 1;
        const limit = input.limit ?? 50;

        const response = await nango.get({
            // https://desk.zoho.com/DeskAPIDocument#Agents#Agents_Listagents
            endpoint: '/api/v1/agents',
            params: {
                from: String(from),
                limit: String(limit)
            },
            retries: 3,
            ...(baseUrlOverride !== undefined && { baseUrlOverride })
        });

        const responseData = z
            .object({
                data: z.array(z.unknown())
            })
            .parse(response.data);

        const items: z.infer<typeof AgentSchema>[] = [];
        for (const raw of responseData.data) {
            const agent = z
                .object({
                    id: z.string(),
                    firstName: z.string().optional(),
                    lastName: z.string().optional(),
                    name: z.string().optional(),
                    emailId: z.string().optional(),
                    status: z.string().optional(),
                    roleId: z.string().optional(),
                    rolePermissionType: z.string().optional(),
                    isConfirmed: z.boolean().optional(),
                    profileId: z.string().optional(),
                    associatedDepartmentIds: z.array(z.string()).optional(),
                    photoURL: z.string().optional(),
                    zuid: z.string().optional()
                })
                .parse(raw);

            items.push({
                id: agent.id,
                ...(agent.firstName !== undefined && { firstName: agent.firstName }),
                ...(agent.lastName !== undefined && { lastName: agent.lastName }),
                ...(agent.name !== undefined && { name: agent.name }),
                ...(agent.emailId !== undefined && { emailId: agent.emailId }),
                ...(agent.status !== undefined && { status: agent.status }),
                ...(agent.roleId !== undefined && { roleId: agent.roleId }),
                ...(agent.rolePermissionType !== undefined && { rolePermissionType: agent.rolePermissionType }),
                ...(agent.isConfirmed !== undefined && { isConfirmed: agent.isConfirmed }),
                ...(agent.profileId !== undefined && { profileId: agent.profileId }),
                ...(agent.associatedDepartmentIds !== undefined && { associatedDepartmentIds: agent.associatedDepartmentIds }),
                ...(agent.photoURL !== undefined && { photoURL: agent.photoURL }),
                ...(agent.zuid !== undefined && { zuid: agent.zuid })
            });
        }

        const nextCursor = responseData.data.length === limit ? String(from + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
