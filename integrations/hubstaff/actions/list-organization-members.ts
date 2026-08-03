import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.number().describe('Organization ID. Example: 775646'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of members to return per page.'),
    include_removed: z.boolean().optional().describe('Whether to include removed members in the results.'),
    search_email: z.string().optional().describe('Filter members by email address.'),
    search_name: z.string().optional().describe('Filter members by name.')
});

const ProviderMemberSchema = z
    .object({
        user_id: z.number(),
        membership_role: z.string(),
        membership_status: z.string(),
        effective_role: z.string().optional(),
        bill_rate: z.number().nullable().optional(),
        currency: z.string().nullable().optional(),
        fixed_pay_rate: z.number().nullable().optional(),
        pay_rate: z.number().nullable().optional(),
        pay_period: z.string().nullable().optional(),
        trackable: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        removed_at: z.string().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        members: z.array(ProviderMemberSchema).optional(),
        pagination: z
            .object({
                next_page_start_id: z.union([z.string(), z.number()]).optional().nullable()
            })
            .optional()
    })
    .passthrough();

const MemberOutputSchema = z.object({
    user_id: z.number(),
    membership_role: z.string(),
    membership_status: z.string(),
    effective_role: z.string().optional(),
    bill_rate: z.number().optional(),
    currency: z.string().optional(),
    fixed_pay_rate: z.number().optional(),
    pay_rate: z.number().optional(),
    pay_period: z.string().optional(),
    trackable: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    removed_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(MemberOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List members of an organization, with their role and membership status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/reference/get-v2-organizations-organization-id-members
            endpoint: `v2/organizations/${encodeURIComponent(String(input.organization_id))}/members`,
            params: {
                ...(input.cursor && { page_start_id: input.cursor }),
                ...(input.limit !== undefined && { page_limit: String(input.limit) }),
                ...(input.include_removed !== undefined && { include_removed: String(input.include_removed) }),
                ...(input.search_email && { 'search[email]': input.search_email }),
                ...(input.search_name && { 'search[name]': input.search_name })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const members = providerResponse.members || [];

        const items = members.map((member) => ({
            user_id: member.user_id,
            membership_role: member.membership_role,
            membership_status: member.membership_status,
            ...(member.effective_role !== undefined && { effective_role: member.effective_role }),
            ...(member.bill_rate != null && { bill_rate: member.bill_rate }),
            ...(member.currency != null && { currency: member.currency }),
            ...(member.fixed_pay_rate != null && { fixed_pay_rate: member.fixed_pay_rate }),
            ...(member.pay_rate != null && { pay_rate: member.pay_rate }),
            ...(member.pay_period != null && { pay_period: member.pay_period }),
            ...(member.trackable !== undefined && { trackable: member.trackable }),
            ...(member.created_at !== undefined && { created_at: member.created_at }),
            ...(member.updated_at !== undefined && { updated_at: member.updated_at }),
            ...(member.removed_at != null && { removed_at: member.removed_at })
        }));

        return {
            items,
            ...(providerResponse.pagination?.next_page_start_id != null && { next_cursor: String(providerResponse.pagination.next_page_start_id) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
