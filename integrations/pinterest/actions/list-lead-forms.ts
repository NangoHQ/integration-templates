import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('The Ad Account ID to list lead forms for. Example: "549770573673"'),
    cursor: z.string().optional().describe('Pagination cursor (bookmark) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(250).optional().describe('Number of results per page. Defaults to the provider limit.')
});

const LeadFormStatusSchema = z.enum(['DRAFT', 'ACTIVE']);

const LeadFormQuestionFieldTypeSchema = z.enum(['TEXT_FIELD', 'TEXT_AREA', 'RADIO_LIST', 'CHECKBOX']).nullable().optional();

const LeadFormQuestionTypeSchema = z.enum([
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
]);

const LeadFormQuestionSchema = z.object({
    question_type: LeadFormQuestionTypeSchema.optional(),
    custom_question_field_type: LeadFormQuestionFieldTypeSchema,
    custom_question_label: z.string().nullable().optional(),
    custom_question_options: z.array(z.string()).nullable().optional()
});

const LeadFormPolicyLinkSchema = z.object({
    label: z.string().optional(),
    link: z.string().optional()
});

const LeadFormSchema = z.object({
    id: z.string(),
    ad_account_id: z.string().optional(),
    name: z.string().nullable().optional(),
    status: LeadFormStatusSchema,
    completion_message: z.string().nullable().optional(),
    disclosure_language: z.string().nullable().optional(),
    privacy_policy_link: z.string().nullable().optional(),
    has_accepted_terms: z.boolean().optional(),
    questions: z.array(LeadFormQuestionSchema),
    policy_links: z.array(LeadFormPolicyLinkSchema).optional(),
    created_time: z.number().int().optional(),
    updated_time: z.number().int().optional()
});

const ListResponseSchema = z.object({
    items: z.array(LeadFormSchema),
    bookmark: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(LeadFormSchema),
    bookmark: z.string().optional().describe('Pagination bookmark for the next page. Omit if absent or null.')
});

const action = createAction({
    description: 'List lead-generation ad forms.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/lead_forms/list
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/lead_forms`,
            params: {
                ...(input.cursor && { bookmark: input.cursor }),
                ...(input.page_size !== undefined && { page_size: String(input.page_size) })
            },
            retries: 3
        });

        const parsedResponse = ListResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Pinterest API.',
                details: parsedResponse.error.issues
            });
        }

        const { items, bookmark } = parsedResponse.data;
        const nextBookmark = bookmark != null && bookmark.length > 0 ? bookmark : undefined;

        return {
            items,
            ...(nextBookmark !== undefined && { bookmark: nextBookmark })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
