import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().optional().describe('SPI key of the employee whose direct reports should be returned. Required when include_manager is true.'),
    include_manager: z
        .boolean()
        .optional()
        .describe('When true, the response also includes the employee referenced by employee_id and its manager. Requires employee_id.'),
    legal_entity_ids: z
        .array(z.string())
        .optional()
        .describe('Filter by one or more legal entity identifiers (UUIDs or numeric ids). Use -1 to match employees without a legal entity.'),
    department_ids: z.array(z.string()).optional().describe('Filter by one or more department SPI keys.')
});

const ProviderContentSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    avatar: z.string().nullish(),
    initials: z.string(),
    title: z.string(),
    state: z.string(),
    department: z.string().nullish(),
    entity: z.string().nullish(),
    email: z.string().nullish(),
    employee_number: z.string().nullish(),
    hire_date: z.string().nullish(),
    division: z.string().nullish(),
    manager: z.string().nullish(),
    filler_node: z.boolean().optional()
});

const ProviderNodeSchema = z.object({
    id: z.string(),
    name: z.string().nullish(),
    avatar_url: z.string().nullish(),
    parent_id: z.string().nullish(),
    direct_reports_count: z.number().nullish(),
    content: ProviderContentSchema
});

const OutputSchema = z.object({
    nodes: z.array(
        z.object({
            id: z.string(),
            name: z.string().optional(),
            avatar_url: z.string().optional(),
            parent_id: z.string().optional(),
            direct_reports_count: z.number().optional(),
            content: z.object({
                id: z.string(),
                name: z.string().optional(),
                avatar: z.string().optional(),
                initials: z.string(),
                title: z.string(),
                state: z.string(),
                department: z.string().optional(),
                entity: z.string().optional(),
                email: z.string().optional(),
                employee_number: z.string().optional(),
                hire_date: z.string().optional(),
                division: z.string().optional(),
                manager: z.string().optional(),
                filler_node: z.boolean().optional()
            })
        })
    )
});

const action = createAction({
    description: 'Retrieve the reporting-line org chart, optionally scoped to one employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/employees-orgchart
            endpoint: '/spi/v3/employees/orgchart',
            params: {
                ...(input.employee_id !== undefined && { employee_id: input.employee_id }),
                ...(input.include_manager !== undefined && { include_manager: String(input.include_manager) }),
                ...(input.legal_entity_ids !== undefined && { legal_entity_ids: input.legal_entity_ids }),
                ...(input.department_ids !== undefined && { department_ids: input.department_ids })
            },
            retries: 3
        });

        const providerNodes = z.array(ProviderNodeSchema).parse(response.data);

        return {
            nodes: providerNodes.map((node) => ({
                id: node.id,
                ...(node.name != null && { name: node.name }),
                ...(node.avatar_url != null && { avatar_url: node.avatar_url }),
                ...(node.parent_id != null && { parent_id: node.parent_id }),
                ...(node.direct_reports_count != null && { direct_reports_count: node.direct_reports_count }),
                content: {
                    id: node.content.id,
                    ...(node.content.name != null && { name: node.content.name }),
                    ...(node.content.avatar != null && { avatar: node.content.avatar }),
                    initials: node.content.initials,
                    title: node.content.title,
                    state: node.content.state,
                    ...(node.content.department != null && { department: node.content.department }),
                    ...(node.content.entity != null && { entity: node.content.entity }),
                    ...(node.content.email != null && { email: node.content.email }),
                    ...(node.content.employee_number != null && { employee_number: node.content.employee_number }),
                    ...(node.content.hire_date != null && { hire_date: node.content.hire_date }),
                    ...(node.content.division != null && { division: node.content.division }),
                    ...(node.content.manager != null && { manager: node.content.manager }),
                    ...(node.content.filler_node != null && { filler_node: node.content.filler_node })
                }
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
