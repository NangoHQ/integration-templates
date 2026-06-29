import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()]).optional().describe('FreshBooks business ID. Example: 14719708')
});

const InputSchema = z.object({
    title: z.string().describe('Project title. Example: "Website Redesign"'),
    client_id: z.number().describe('Client ID to bill for the project. Example: 567521'),
    description: z.string().optional().describe('Project description.'),
    due_date: z.string().optional().describe('Projected completion date. Example: "2026-07-31"'),
    project_type: z.enum(['fixed_price', 'hourly_rate']).optional().describe('Type of project billing.'),
    fixed_price: z.string().optional().describe('Flat-rate amount charged to the client. Example: "500.00"'),
    budget: z.number().optional().describe('Budget for the project.'),
    rate: z.string().optional().describe('Hourly rate of the project. Example: "75.00"'),
    internal: z.boolean().optional().describe('Whether the project is internal to the company.'),
    active: z.boolean().optional().describe('Whether the project is active.'),
    complete: z.boolean().optional().describe('Whether the project is completed.')
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    title: z.string(),
    client_id: z.number(),
    description: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    project_type: z.string().nullable().optional(),
    fixed_price: z.string().nullable().optional(),
    budget: z.number().nullable().optional(),
    rate: z.string().nullable().optional(),
    internal: z.boolean().nullable().optional(),
    active: z.boolean().nullable().optional(),
    complete: z.boolean().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    logged_duration: z.number().nullable().optional(),
    billing_method: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    title: z.string(),
    client_id: z.number(),
    description: z.string().optional(),
    due_date: z.string().optional(),
    project_type: z.string().optional(),
    fixed_price: z.string().optional(),
    budget: z.number().optional(),
    rate: z.string().optional(),
    internal: z.boolean().optional(),
    active: z.boolean().optional(),
    complete: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    logged_duration: z.number().optional(),
    billing_method: z.string().optional()
});

const action = createAction({
    description: 'Create a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:projects:write'],
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionMetadata = z.object({ businessId: z.union([z.string(), z.number()]).optional() }).parse(connection.metadata || {});
        let businessId = connectionMetadata.businessId;

        if (!businessId) {
            // https://www.freshbooks.com/api/authentication
            const authResponse = await nango.get({
                endpoint: '/auth/api/v1/users/me',
                retries: 3
            });

            const userSchema = z.object({
                response: z.object({
                    business_memberships: z.array(
                        z.object({
                            business: z.object({
                                id: z.union([z.string(), z.number()]),
                                account_id: z.string()
                            })
                        })
                    )
                })
            });

            const userData = userSchema.parse(authResponse.data);
            const fallbackBusinessId = userData.response.business_memberships[0]?.business?.id;

            if (!fallbackBusinessId) {
                throw new nango.ActionError({
                    type: 'invalid_metadata',
                    message: 'businessId is required in connection metadata and could not be retrieved from the FreshBooks API.'
                });
            }

            businessId = fallbackBusinessId;
        }

        const requestBody: Record<string, unknown> = {
            project: {
                title: input.title,
                client_id: input.client_id,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.due_date !== undefined && { due_date: input.due_date }),
                ...(input.project_type !== undefined && { project_type: input.project_type }),
                ...(input.fixed_price !== undefined && { fixed_price: input.fixed_price }),
                ...(input.budget !== undefined && { budget: input.budget }),
                ...(input.rate !== undefined && { rate: input.rate }),
                ...(input.internal !== undefined && { internal: input.internal }),
                ...(input.active !== undefined && { active: input.active }),
                ...(input.complete !== undefined && { complete: input.complete })
            }
        };

        // https://www.freshbooks.com/api/project
        const response = await nango.post({
            endpoint: `/projects/business/${encodeURIComponent(String(businessId))}/project`,
            data: requestBody,
            retries: 3
        });

        const rawData = z.object({ project: z.unknown() }).parse(response.data);
        const providerProject = ProviderProjectSchema.parse(rawData.project);

        return {
            id: providerProject.id,
            title: providerProject.title,
            client_id: providerProject.client_id,
            ...(providerProject.description != null && { description: providerProject.description }),
            ...(providerProject.due_date != null && { due_date: providerProject.due_date }),
            ...(providerProject.project_type != null && { project_type: providerProject.project_type }),
            ...(providerProject.fixed_price != null && { fixed_price: providerProject.fixed_price }),
            ...(providerProject.budget != null && { budget: providerProject.budget }),
            ...(providerProject.rate != null && { rate: providerProject.rate }),
            ...(providerProject.internal != null && { internal: providerProject.internal }),
            ...(providerProject.active != null && { active: providerProject.active }),
            ...(providerProject.complete != null && { complete: providerProject.complete }),
            ...(providerProject.created_at != null && { created_at: providerProject.created_at }),
            ...(providerProject.updated_at != null && { updated_at: providerProject.updated_at }),
            ...(providerProject.logged_duration != null && { logged_duration: providerProject.logged_duration }),
            ...(providerProject.billing_method != null && { billing_method: providerProject.billing_method })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
