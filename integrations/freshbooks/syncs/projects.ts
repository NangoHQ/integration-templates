import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()])
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ServiceSchema = z.object({
    business_id: z.number(),
    name: z.string(),
    id: z.number()
});

const GroupMemberSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    identity_id: z.number(),
    active: z.boolean(),
    company: z.string(),
    id: z.number(),
    email: z.string()
});

const GroupSchema = z.object({
    pending_invitations: z.array(z.string()).optional(),
    id: z.number(),
    members: z.array(GroupMemberSchema).optional()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    client_id: z.number().nullable().optional(),
    project_type: z.string().optional(),
    fixed_price: z.string().nullable().optional(),
    budget: z.number().nullable().optional(),
    rate: z.string().nullable().optional(),
    billing_method: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    complete: z.boolean().optional(),
    active: z.boolean().optional(),
    internal: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    logged_duration: z.number().nullable().optional(),
    services: z.array(ServiceSchema).nullable().optional(),
    group: GroupSchema.nullable().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    client_id: z.number().optional(),
    project_type: z.string().optional(),
    fixed_price: z.string().optional(),
    budget: z.number().optional(),
    rate: z.string().optional(),
    billing_method: z.string().optional(),
    due_date: z.string().optional(),
    complete: z.boolean().optional(),
    active: z.boolean().optional(),
    internal: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    logged_duration: z.number().optional(),
    services: z.array(ServiceSchema).optional(),
    group: GroupSchema.optional()
});

const sync = createSync({
    description: 'Sync projects.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    scopes: ['user:projects:read'],
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('Missing required metadata: businessId');
        }
        const businessId = String(metadataResult.data.businessId);

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? {});
        const checkpoint = checkpointResult.success ? checkpointResult.data : { updated_after: '' };

        const syncStartTime = new Date().toISOString();
        let maxUpdatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/project
            endpoint: `/projects/business/${encodeURIComponent(businessId)}/projects`,
            params: {
                sort: 'updated_at:asc',
                ...(checkpoint?.updated_after && { updated_after: checkpoint.updated_after })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 30,
                response_path: 'projects'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const projects: Array<z.infer<typeof ProjectSchema>> = [];

            for (const raw of page) {
                const parsed = ProviderProjectSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse project: ${parsed.error.message}`);
                }

                const project = parsed.data;
                projects.push({
                    id: String(project.id),
                    ...(project.title !== undefined && { title: project.title }),
                    ...(project.description !== null && project.description !== undefined && { description: project.description }),
                    ...(project.client_id !== null && project.client_id !== undefined && { client_id: project.client_id }),
                    ...(project.project_type !== undefined && { project_type: project.project_type }),
                    ...(project.fixed_price !== null && project.fixed_price !== undefined && { fixed_price: project.fixed_price }),
                    ...(project.budget !== null && project.budget !== undefined && { budget: project.budget }),
                    ...(project.rate !== null && project.rate !== undefined && { rate: project.rate }),
                    ...(project.billing_method !== null && project.billing_method !== undefined && { billing_method: project.billing_method }),
                    ...(project.due_date !== null && project.due_date !== undefined && { due_date: project.due_date }),
                    ...(project.complete !== undefined && { complete: project.complete }),
                    ...(project.active !== undefined && { active: project.active }),
                    ...(project.internal !== undefined && { internal: project.internal }),
                    ...(project.created_at !== undefined && { created_at: project.created_at }),
                    ...(project.updated_at !== undefined && { updated_at: project.updated_at }),
                    ...(project.logged_duration !== null && project.logged_duration !== undefined && { logged_duration: project.logged_duration }),
                    ...(project.services !== null && project.services !== undefined && { services: project.services }),
                    ...(project.group !== null && project.group !== undefined && { group: project.group })
                });

                if (project.updated_at) {
                    if (maxUpdatedAt === undefined || project.updated_at > maxUpdatedAt) {
                        maxUpdatedAt = project.updated_at;
                    }
                }
            }

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.saveCheckpoint({
            updated_after: maxUpdatedAt ?? syncStartTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
