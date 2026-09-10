import { z } from 'zod';
import { createAction } from 'nango';

const EnrollmentModeSchema = z.enum(['manual_invitation', 'automatic_invitation', 'automatic_suggestion', 'enterprise_sso']);
const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor returned by a previous request. Omit for the first page.'),
    limit: z.number().int().min(1).max(500).optional(),
    organization_id: z.string(),
    verified: z.boolean().optional(),
    enrollment_mode: EnrollmentModeSchema.optional()
});
const ResourceSchema = z
    .object({
        id: z.string(),
        object: z.string().optional(),
        organization_id: z.string().optional(),
        name: z.string(),
        enrollment_mode: EnrollmentModeSchema.optional(),
        affiliation_verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verification: z.object({ attempts: z.number().optional(), status: z.string().optional() }).passthrough().optional(),
        verified: z.boolean().optional(),
        created_at: z.number().optional(),
        updated_at: z.number().optional()
    })
    .passthrough();
const ProviderResponseSchema = z.object({ data: z.array(ResourceSchema), total_count: z.number() });
const OutputSchema = z.object({ items: z.array(ResourceSchema), next_cursor: z.string().optional(), total: z.number() });
const action = createAction({
    description: 'List verified domains for a Clerk organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor === undefined ? 0 : Number.parseInt(input.cursor, 10);
        if (!Number.isInteger(offset) || offset < 0) throw new nango.ActionError({ type: 'invalid_cursor', message: 'Cursor must be a non-negative integer.' });
        const response = await nango.get({
            // https://clerk.com/docs/reference/backend-api/tag/Organization-Domains#operation/ListOrganizationDomains
            endpoint: `/v1/organizations/${encodeURIComponent(input.organization_id)}/domains`,
            params: {
                offset: String(offset),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.verified !== undefined && { verified: String(input.verified) }),
                ...(input.enrollment_mode !== undefined && { enrollment_mode: input.enrollment_mode })
            },
            retries: 3
        });
        const provider = ProviderResponseSchema.parse(response.data);
        const nextOffset = offset + provider.data.length;
        return { items: provider.data, ...(nextOffset < provider.total_count && { next_cursor: String(nextOffset) }), total: provider.total_count };
    }
});
export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
