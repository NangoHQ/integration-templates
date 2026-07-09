import { z } from 'zod';
import { createAction } from 'nango';

const LeadFormQuestionSchema = z.object({
    question_type: z
        .enum([
            'CUSTOM',
            'FULL_NAME',
            'FIRST_NAME',
            'LAST_NAME',
            'EMAIL',
            'PHONE_NUMBER',
            'ZIP_CODE',
            'GENDER',
            'CITY',
            'COUNTRY',
            'STATE_PROVINCE',
            'ADDRESS',
            'DATE_OF_BIRTH',
            'AGE'
        ])
        .describe('Type of question. Example: "CUSTOM"'),
    custom_question_field_type: z
        .enum(['TEXT_FIELD', 'TEXT_AREA', 'RADIO_LIST', 'CHECKBOX'])
        .optional()
        .describe('Field type for custom questions. Required when question_type is CUSTOM.'),
    custom_question_label: z.string().optional().describe('Label for a custom question. Required when question_type is CUSTOM.'),
    custom_question_options: z.array(z.string()).max(5).optional().describe('Options for a custom question (max 5). Required for RADIO_LIST and CHECKBOX.')
});

const LeadFormPolicyLinkSchema = z.object({
    label: z.string().describe('Policy label. Example: "Copyright"'),
    link: z.string().describe('Policy URL. Example: "https://policy.pinterest.com/en/copyright"')
});

const LeadFormCreateSchema = z.object({
    name: z.string().describe('Internal name of the lead form. Example: "Lead Form 3/14/2023"'),
    has_accepted_terms: z.boolean().describe("Whether the advertiser has accepted Pinterest's terms of service for creating a lead ad."),
    privacy_policy_link: z.string().describe('A link to the advertiser\'s privacy policy. Example: "https://www.advertisername.com/privacy-policy"'),
    completion_message: z.string().describe('A message for people who complete the form. Example: "Thank you for submitting. We will contact you soon."'),
    questions: z.array(LeadFormQuestionSchema).min(0).max(10).describe('List of questions to display on the lead form (max 10).'),
    disclosure_language: z.string().optional().describe('Additional disclosure language to be included in the lead form.'),
    policy_links: z.array(LeadFormPolicyLinkSchema).max(3).optional().describe('Additional policy links to display on the lead form (max 3).'),
    status: z.enum(['DRAFT', 'ACTIVE']).optional().describe('Status of the lead form.')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    lead_forms: z.array(LeadFormCreateSchema).min(1).max(30).describe('List of lead forms to create (max 30).')
});

const LeadFormSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().nullable().optional(),
    has_accepted_terms: z.boolean().optional(),
    privacy_policy_link: z.string().nullable().optional(),
    completion_message: z.string().nullable().optional(),
    questions: z.array(LeadFormQuestionSchema.passthrough()).optional(),
    policy_links: z.array(LeadFormPolicyLinkSchema).optional(),
    disclosure_language: z.string().nullable().optional(),
    status: z.enum(['DRAFT', 'ACTIVE']).optional(),
    created_time: z.number().optional(),
    updated_time: z.number().optional()
});

const BatchItemExceptionSchema = z.object({
    code: z.number().optional(),
    message: z.string()
});

const BatchItemSchema = z.object({
    data: LeadFormSchema.optional(),
    exceptions: z.array(BatchItemExceptionSchema).optional()
});

const ProviderResponseSchema = z.object({
    items: z.array(BatchItemSchema)
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            data: LeadFormSchema.optional(),
            exceptions: z.array(BatchItemExceptionSchema).optional()
        })
    )
});

const action = createAction({
    description: 'Create lead-generation ad forms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/lead_forms/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/lead_forms`,
            data: input.lead_forms,
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.',
                details: parsed.error.issues
            });
        }

        const result = parsed.data;

        return {
            items: result.items.map((item) => ({
                ...(item.data !== undefined && { data: item.data }),
                ...(item.exceptions !== undefined && { exceptions: item.exceptions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
