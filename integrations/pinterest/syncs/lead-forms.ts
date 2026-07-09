import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LeadFormPolicyLinkSchema = z.object({
    label: z.string(),
    link: z.string()
});

const LeadFormQuestionSchema = z.object({
    question_type: z.string().optional(),
    custom_question_field_type: z.string().optional(),
    custom_question_label: z.string().optional(),
    custom_question_options: z.array(z.string()).optional()
});

const ProviderLeadFormQuestionSchema = z.object({
    question_type: z.string().nullable().optional(),
    custom_question_field_type: z.string().nullable().optional(),
    custom_question_label: z.string().nullable().optional(),
    custom_question_options: z.array(z.string()).nullable().optional()
});

const LeadFormSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    name: z.string().optional(),
    completion_message: z.string().optional(),
    disclosure_language: z.string().optional(),
    has_accepted_terms: z.boolean().optional(),
    privacy_policy_link: z.string().optional(),
    policy_links: z.array(LeadFormPolicyLinkSchema).optional(),
    questions: z.array(LeadFormQuestionSchema).optional(),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const ProviderLeadFormSchema = z.object({
    id: z.string(),
    ad_account_id: z.string(),
    name: z.string().nullable().optional(),
    completion_message: z.string().nullable().optional(),
    disclosure_language: z.string().nullable().optional(),
    has_accepted_terms: z.boolean().optional(),
    privacy_policy_link: z.string().nullable().optional(),
    policy_links: z.array(LeadFormPolicyLinkSchema).optional(),
    questions: z.array(ProviderLeadFormQuestionSchema).optional(),
    status: z.string().optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const AdAccountSchema = z.object({
    id: z.string()
});

const sync = createSync({
    description: 'Sync lead-generation ad forms',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        LeadForm: LeadFormSchema
    },

    exec: async (nango) => {
        const adAccountProxyConfig: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#tag/ad_accounts
            endpoint: '/v5/ad_accounts',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'bookmark',
                cursor_path_in_response: 'bookmark',
                response_path: 'items',
                limit_name_in_request: 'page_size',
                limit: 100
            },
            retries: 3
        };

        const adAccounts: Array<{ id: string }> = [];
        for await (const page of nango.paginate(adAccountProxyConfig)) {
            for (const raw of page) {
                const parsed = AdAccountSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Invalid ad account response: ${parsed.error.message}`);
                }
                adAccounts.push(parsed.data);
            }
        }

        if (adAccounts.length === 0) {
            return;
        }

        await nango.trackDeletesStart('LeadForm');

        for (const adAccount of adAccounts) {
            const leadFormProxyConfig: ProxyConfiguration = {
                // https://developers.pinterest.com/docs/api/v5/#tag/lead_forms
                endpoint: `/v5/ad_accounts/${encodeURIComponent(adAccount.id)}/lead_forms`,
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'bookmark',
                    cursor_path_in_response: 'bookmark',
                    response_path: 'items',
                    limit_name_in_request: 'page_size',
                    limit: 25
                },
                retries: 3
            };

            for await (const page of nango.paginate(leadFormProxyConfig)) {
                const leadForms = [];
                for (const raw of page) {
                    const parsed = ProviderLeadFormSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Invalid lead form response: ${parsed.error.message}`);
                    }
                    const form = parsed.data;
                    leadForms.push({
                        id: form.id,
                        ad_account_id: form.ad_account_id,
                        ...(form.name != null && { name: form.name }),
                        ...(form.completion_message != null && { completion_message: form.completion_message }),
                        ...(form.disclosure_language != null && { disclosure_language: form.disclosure_language }),
                        ...(form.has_accepted_terms !== undefined && { has_accepted_terms: form.has_accepted_terms }),
                        ...(form.privacy_policy_link != null && { privacy_policy_link: form.privacy_policy_link }),
                        ...(form.policy_links && { policy_links: form.policy_links }),
                        ...(form.questions && {
                            questions: form.questions.map((question) => ({
                                ...(question.question_type != null && { question_type: question.question_type }),
                                ...(question.custom_question_field_type != null && {
                                    custom_question_field_type: question.custom_question_field_type
                                }),
                                ...(question.custom_question_label != null && { custom_question_label: question.custom_question_label }),
                                ...(question.custom_question_options != null && { custom_question_options: question.custom_question_options })
                            }))
                        }),
                        ...(form.status && { status: form.status }),
                        ...(form.created_time !== undefined && { created_time: form.created_time }),
                        ...(form.updated_time !== undefined && { updated_time: form.updated_time })
                    });
                }

                if (leadForms.length > 0) {
                    await nango.batchSave(leadForms, 'LeadForm');
                }
            }
        }

        await nango.trackDeletesEnd('LeadForm');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
