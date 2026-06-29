import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    business_id: z
        .union([z.number(), z.string()])
        .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
        .describe('FreshBooks business ID. Example: 14719708'),
    account_id: z.string().optional().describe('FreshBooks account ID. Example: ZyQ04o')
});

const InputSchema = z.object({
    project_id: z.number().describe('The unique id of the project to update. Example: 779597'),
    title: z.string().optional().describe('The project title'),
    description: z.string().nullable().optional().describe('The project description'),
    due_date: z.string().nullable().optional().describe('Date of projected completion. Example: 2017-07-12'),
    client_id: z.number().nullable().optional().describe('Unique id of the client being billed for the project'),
    project_type: z.enum(['fixed_price', 'hourly_rate']).nullable().optional().describe('Type of project'),
    fixed_price: z.string().nullable().optional().describe('Used for flat-rate projects. Represents the amount being charged'),
    budget: z.number().nullable().optional().describe('Budget for project'),
    complete: z.boolean().nullable().optional().describe('Whether the project has been completed'),
    active: z.boolean().nullable().optional().describe('Whether the project is active'),
    internal: z.boolean().nullable().optional().describe('Clarifies that the project is internal'),
    rate: z.string().nullable().optional().describe('The hourly rate of the project'),
    billing_method: z.string().nullable().optional().describe('The method of payment for the project')
});

const ProjectMemberSchema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.string().optional(),
    identity_id: z.number().optional(),
    active: z.boolean().optional(),
    company: z.string().optional(),
    id: z.number().optional(),
    email: z.string().optional()
});

const ProjectGroupSchema = z.object({
    pending_invitations: z.union([z.array(z.string()), z.null()]).optional(),
    id: z.number().optional(),
    members: z.array(ProjectMemberSchema).optional()
});

const ProjectServiceSchema = z.object({
    business_id: z.number().optional(),
    name: z.string().optional(),
    id: z.number().optional()
});

const ProjectLinksSchema = z.object({
    self: z.string().optional(),
    threads: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.union([z.string(), z.null()]).optional(),
    due_date: z.union([z.string(), z.null()]).optional(),
    project_type: z.string().optional(),
    fixed_price: z.union([z.string(), z.null()]).optional(),
    budget: z.union([z.number(), z.null()]).optional(),
    complete: z.boolean().optional(),
    active: z.boolean().optional(),
    internal: z.boolean().optional(),
    client_id: z.union([z.number(), z.null()]).optional(),
    rate: z.union([z.string(), z.null()]).optional(),
    billing_method: z.union([z.string(), z.null()]).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    logged_duration: z.union([z.number(), z.null()]).optional(),
    sample: z.boolean().optional(),
    links: ProjectLinksSchema.optional(),
    group: ProjectGroupSchema.optional(),
    services: z.array(ProjectServiceSchema).optional()
});

const OutputSchema = z.object({
    project: ProjectSchema
});

const action = createAction({
    description: 'Update a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:projects:write'],
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'business_id is required in connection metadata.'
            });
        }
        const businessId = parsedMetadata.data.business_id;

        const payload: {
            title?: string;
            description?: string | null;
            due_date?: string | null;
            client_id?: number | null;
            project_type?: 'fixed_price' | 'hourly_rate' | null;
            fixed_price?: string | null;
            budget?: number | null;
            complete?: boolean | null;
            active?: boolean | null;
            internal?: boolean | null;
            rate?: string | null;
            billing_method?: string | null;
        } = {};
        if (input.title !== undefined) {
            payload.title = input.title;
        }
        if (input.description !== undefined) {
            payload.description = input.description;
        }
        if (input.due_date !== undefined) {
            payload.due_date = input.due_date;
        }
        if (input.client_id !== undefined) {
            payload.client_id = input.client_id;
        }
        if (input.project_type !== undefined) {
            payload.project_type = input.project_type;
        }
        if (input.fixed_price !== undefined) {
            payload.fixed_price = input.fixed_price;
        }
        if (input.budget !== undefined) {
            payload.budget = input.budget;
        }
        if (input.complete !== undefined) {
            payload.complete = input.complete;
        }
        if (input.active !== undefined) {
            payload.active = input.active;
        }
        if (input.internal !== undefined) {
            payload.internal = input.internal;
        }
        if (input.rate !== undefined) {
            payload.rate = input.rate;
        }
        if (input.billing_method !== undefined) {
            payload.billing_method = input.billing_method;
        }

        const response = await nango.put({
            // https://www.freshbooks.com/api/project
            endpoint: `/projects/business/${encodeURIComponent(String(businessId))}/project/${encodeURIComponent(String(input.project_id))}`,
            data: {
                project: payload
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                project: z.unknown()
            })
            .parse(response.data);

        const project = ProjectSchema.parse(providerResponse.project);

        return {
            project: project
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
