import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const PermissionSchema = z.string();

const MembershipSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    organization_id: z.string(),
    role: z.string(),
    permissions_granted: z.array(PermissionSchema).optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional()
});

const LeadStatusSchema = z.object({
    id: z.string(),
    label: z.string(),
    organization_id: z.string().optional()
});

const OpportunityStatusSchema = z.object({
    id: z.string(),
    label: z.string(),
    organization_id: z.string().optional()
});

const PipelineSchema = z.object({
    id: z.string(),
    name: z.string(),
    organization_id: z.string().optional()
});

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    lead_statuses: z.array(LeadStatusSchema).optional(),
    opportunity_statuses: z.array(OpportunityStatusSchema).optional(),
    pipelines: z.array(PipelineSchema).optional()
});

const EmailAccountSchema = z.object({
    id: z.string(),
    email: z.string()
});

const PhoneNumberSchema = z.object({
    id: z.string(),
    phone_number: z.string().optional()
});

const ProviderMeSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    memberships: z.array(MembershipSchema).optional(),
    organizations: z.array(OrganizationSchema).optional(),
    email_accounts: z.array(EmailAccountSchema).optional(),
    phone_numbers: z.array(PhoneNumberSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    memberships: z.array(MembershipSchema).optional(),
    organizations: z.array(OrganizationSchema).optional(),
    email_accounts: z.array(EmailAccountSchema).optional(),
    phone_numbers: z.array(PhoneNumberSchema).optional()
});

const action = createAction({
    description: "Retrieve the authenticated user's full profile including memberships, permissions, and organization.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/
            endpoint: '/v1/me/',
            retries: 3
        });

        const me = ProviderMeSchema.parse(response.data);

        return {
            id: me.id,
            email: me.email,
            ...(me.first_name !== undefined && { first_name: me.first_name }),
            ...(me.last_name !== undefined && { last_name: me.last_name }),
            ...(me.name !== undefined && { name: me.name }),
            ...(me.date_created !== undefined && { date_created: me.date_created }),
            ...(me.date_updated !== undefined && { date_updated: me.date_updated }),
            ...(me.memberships !== undefined && { memberships: me.memberships }),
            ...(me.organizations !== undefined && { organizations: me.organizations }),
            ...(me.email_accounts !== undefined && { email_accounts: me.email_accounts }),
            ...(me.phone_numbers !== undefined && { phone_numbers: me.phone_numbers })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
