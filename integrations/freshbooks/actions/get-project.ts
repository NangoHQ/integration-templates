import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.union([z.string(), z.number()]).describe('Project ID. Example: 13312426')
});

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()]).optional()
});

const ProviderGroupMemberSchema = z.object({
    id: z.number(),
    identity_id: z.number(),
    role: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    company: z.string(),
    active: z.boolean()
});

const ProviderGroupSchema = z.object({
    id: z.number(),
    members: z.array(ProviderGroupMemberSchema),
    pending_invitations: z.array(z.unknown()).nullable()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    client_id: z.number().nullable().optional(),
    internal: z.boolean(),
    budget: z.number().nullable().optional(),
    billing_method: z.string(),
    project_type: z.string(),
    project_manager_id: z.number().nullable().optional(),
    active: z.boolean(),
    complete: z.boolean(),
    sample: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    logged_duration: z.number().nullable().optional(),
    services: z.array(z.unknown()),
    billed_amount: z.string(),
    billed_status: z.string(),
    retainer_id: z.number().nullable().optional(),
    expense_markup: z.string(),
    service_estimate_type: z.string(),
    fixed_price: z.string().nullable().optional(),
    rate: z.string().nullable().optional(),
    group: ProviderGroupSchema.optional()
});

const OutputSchema = ProviderProjectSchema;

const action = createAction({
    description: 'Retrieve a single project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadataRaw = await nango.getMetadata();
        const metadata = MetadataSchema.safeParse(metadataRaw);
        if (!metadata.success || !metadata.data.businessId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'businessId is required in connection metadata.'
            });
        }

        const businessId = String(metadata.data.businessId);
        const projectId = String(input.projectId);

        const response = await nango.get({
            // https://www.freshbooks.com/api/projects
            endpoint: `/projects/business/${encodeURIComponent(businessId)}/projects/${encodeURIComponent(projectId)}`,
            retries: 3
        });

        const ResponseSchema = z.object({
            project: z.unknown()
        });

        const rawData = ResponseSchema.safeParse(response.data);
        if (!rawData.success || !rawData.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found or invalid response.',
                project_id: projectId
            });
        }

        const providerProject = ProviderProjectSchema.parse(rawData.data.project);

        return providerProject;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
