import { z } from 'zod';
import { createAction } from 'nango';
const InputSchema = z.object({
    organization_id: z.string().min(1),
    name: z.string().min(1).optional(),
    slug: z.string().optional(),
    admin_delete_enabled: z.boolean().optional(),
    max_allowed_memberships: z.number().int().min(0).optional()
});
const OrganizationSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        image_url: z.string().optional(),
        has_image: z.boolean().optional(),
        members_count: z.number().optional(),
        max_allowed_memberships: z.number().optional(),
        admin_delete_enabled: z.boolean().optional(),
        public_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
        private_metadata: z.record(z.string(), z.unknown()).optional(),
        created_by: z.string().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const OutputSchema = OrganizationSchema;
const action = createAction({
    description: 'Update a Clerk organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://clerk.com/docs/reference/backend-api/tag/Organizations#operation/UpdateOrganization
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}`,
            data: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.slug !== undefined && { slug: input.slug }),
                ...(input.admin_delete_enabled !== undefined && { admin_delete_enabled: input.admin_delete_enabled }),
                ...(input.max_allowed_memberships !== undefined && { max_allowed_memberships: input.max_allowed_memberships })
            },
            retries: 3
        });
        return OrganizationSchema.parse(response.data);
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
