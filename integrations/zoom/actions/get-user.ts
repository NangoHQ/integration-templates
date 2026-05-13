import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('The user ID or email address of the user. For user-level apps, pass "me" as the value for userId.')
});

const PhoneNumberSchema = z.object({
    code: z.string().optional(),
    country: z.string().optional(),
    number: z.string().optional(),
    verified: z.boolean().optional()
});

const CustomAttributeSchema = z.object({
    key: z.string().optional(),
    name: z.string().optional(),
    value: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    account_id: z.string().optional(),
    cms_user_id: z.string().optional(),
    company: z.string().optional(),
    created_at: z.string().optional(),
    custom_attributes: z.array(CustomAttributeSchema).optional(),
    dept: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    host_key: z.string().optional(),
    im_group_ids: z.array(z.string()).optional(),
    jid: z.string().optional(),
    job_title: z.string().optional(),
    language: z.string().optional(),
    last_client_version: z.string().optional(),
    last_login_time: z.string().optional(),
    last_name: z.string().optional(),
    location: z.string().optional(),
    login_type: z.number().optional(),
    manager: z.string().optional(),
    personal_meeting_url: z.string().optional(),
    phone_country: z.string().optional(),
    phone_number: z.string().optional(),
    phone_numbers: z.array(PhoneNumberSchema).optional(),
    pic_url: z.string().optional(),
    plan_united_type: z.string().optional(),
    pmi: z.number().optional(),
    role_id: z.string().optional(),
    role_name: z.string().optional(),
    status: z.string().optional(),
    timezone: z.string().optional(),
    type: z.number().optional(),
    use_pmi: z.boolean().optional(),
    vanity_url: z.string().optional(),
    verified: z.number().optional()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    account_id: z.string().optional(),
    cms_user_id: z.string().optional(),
    company: z.string().optional(),
    created_at: z.string().optional(),
    custom_attributes: z.array(CustomAttributeSchema).optional(),
    dept: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    group_ids: z.array(z.string()).optional(),
    host_key: z.string().optional(),
    im_group_ids: z.array(z.string()).optional(),
    jid: z.string().optional(),
    job_title: z.string().optional(),
    language: z.string().optional(),
    last_client_version: z.string().optional(),
    last_login_time: z.string().optional(),
    last_name: z.string().optional(),
    location: z.string().optional(),
    login_type: z.number().optional(),
    manager: z.string().optional(),
    personal_meeting_url: z.string().optional(),
    phone_country: z.string().optional(),
    phone_number: z.string().optional(),
    phone_numbers: z.array(PhoneNumberSchema).optional(),
    pic_url: z.string().optional(),
    plan_united_type: z.string().optional(),
    pmi: z.number().optional(),
    role_id: z.string().optional(),
    role_name: z.string().optional(),
    status: z.string().optional(),
    timezone: z.string().optional(),
    type: z.number().optional(),
    use_pmi: z.boolean().optional(),
    vanity_url: z.string().optional(),
    verified: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single user from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:read:admin', 'user:read'],

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://developers.zoom.us/docs/api/rest/reference/user/methods/
            endpoint: `/users/${input.userId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'User not found',
                userId: input.userId
            });
        }

        const raw = ProviderUserSchema.parse(response.data);

        return {
            id: raw.id,
            ...(raw.account_id != null && { account_id: raw.account_id }),
            ...(raw.cms_user_id != null && { cms_user_id: raw.cms_user_id }),
            ...(raw.company != null && { company: raw.company }),
            ...(raw.created_at != null && { created_at: raw.created_at }),
            ...(raw.custom_attributes != null && { custom_attributes: raw.custom_attributes }),
            ...(raw.dept != null && { dept: raw.dept }),
            ...(raw.email != null && { email: raw.email }),
            ...(raw.first_name != null && { first_name: raw.first_name }),
            ...(raw.group_ids != null && { group_ids: raw.group_ids }),
            ...(raw.host_key != null && { host_key: raw.host_key }),
            ...(raw.im_group_ids != null && { im_group_ids: raw.im_group_ids }),
            ...(raw.jid != null && { jid: raw.jid }),
            ...(raw.job_title != null && { job_title: raw.job_title }),
            ...(raw.language != null && { language: raw.language }),
            ...(raw.last_client_version != null && { last_client_version: raw.last_client_version }),
            ...(raw.last_login_time != null && { last_login_time: raw.last_login_time }),
            ...(raw.last_name != null && { last_name: raw.last_name }),
            ...(raw.location != null && { location: raw.location }),
            ...(raw.login_type != null && { login_type: raw.login_type }),
            ...(raw.manager != null && { manager: raw.manager }),
            ...(raw.personal_meeting_url != null && { personal_meeting_url: raw.personal_meeting_url }),
            ...(raw.phone_country != null && { phone_country: raw.phone_country }),
            ...(raw.phone_number != null && { phone_number: raw.phone_number }),
            ...(raw.phone_numbers != null && { phone_numbers: raw.phone_numbers }),
            ...(raw.pic_url != null && { pic_url: raw.pic_url }),
            ...(raw.plan_united_type != null && { plan_united_type: raw.plan_united_type }),
            ...(raw.pmi != null && { pmi: raw.pmi }),
            ...(raw.role_id != null && { role_id: raw.role_id }),
            ...(raw.role_name != null && { role_name: raw.role_name }),
            ...(raw.status != null && { status: raw.status }),
            ...(raw.timezone != null && { timezone: raw.timezone }),
            ...(raw.type != null && { type: raw.type }),
            ...(raw.use_pmi != null && { use_pmi: raw.use_pmi }),
            ...(raw.vanity_url != null && { vanity_url: raw.vanity_url }),
            ...(raw.verified != null && { verified: raw.verified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
