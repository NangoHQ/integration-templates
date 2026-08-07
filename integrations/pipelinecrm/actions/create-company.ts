import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('The name of the company. Example: "Acme Inc"'),
    description: z.string().optional().describe('Description of the company.'),
    email: z.string().optional().describe('The email of the company.'),
    web: z.string().optional().describe("The company's website."),
    fax: z.string().optional(),
    address_1: z.string().optional().describe('First line of business address.'),
    address_2: z.string().optional().describe('Second line of business address.'),
    city: z.string().optional().describe('Business address city.'),
    state: z.string().optional().describe('Business address state.'),
    postal_code: z.string().optional().describe('Business address postal code.'),
    country: z.string().optional().describe('Business address country.'),
    facebook_url: z.string().optional().describe("URL to company's facebook profile."),
    linked_in_url: z.string().optional().describe("URL to company's LinkedIn profile."),
    twitter: z.string().optional().describe("Company's twitter username."),
    instant_message: z.string().optional().describe("Company's IM username."),
    phone1: z.string().optional().describe('Primary business number.'),
    phone2: z.string().optional().describe('Secondary business number.'),
    phone3: z.string().optional().describe('Extra business number.'),
    phone4: z.string().optional().describe('Extra business number.'),
    phone1_desc: z.string().optional().describe('Description for the primary business number.'),
    phone2_desc: z.string().optional().describe('Description for the secondary business number.'),
    phone3_desc: z.string().optional().describe('Description for an extra business number.'),
    phone4_desc: z.string().optional().describe('Description for an extra business number.'),
    owner_id: z.number().optional().describe('The ID of the owner of the company.'),
    shared_user_ids: z.array(z.number()).optional().describe('The array of User IDs with whom this company has been shared.'),
    tag_ids: z.array(z.number()).optional().describe('IDs of the tags to set on this company.'),
    custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom fields for the company.')
});

const CompanyTagSchema = z.object({
    id: z.number(),
    name: z.string().optional()
});

const CompanyOwnerSchema = z.object({
    id: z.number().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional()
});

const ProviderCompanySchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    web: z.string().optional().nullable(),
    fax: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    facebook_url: z.string().optional().nullable(),
    linked_in_url: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    instant_message: z.string().optional().nullable(),
    phone1: z.string().optional().nullable(),
    phone2: z.string().optional().nullable(),
    phone3: z.string().optional().nullable(),
    phone4: z.string().optional().nullable(),
    phone1_desc: z.string().optional().nullable(),
    phone2_desc: z.string().optional().nullable(),
    phone3_desc: z.string().optional().nullable(),
    phone4_desc: z.string().optional().nullable(),
    owner_id: z.number().optional().nullable(),
    shared_user_ids: z.array(z.number()).optional().nullable(),
    tag_ids: z.array(z.number()).optional().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    image_thumb_url: z.string().optional().nullable(),
    image_mobile_url: z.string().optional().nullable(),
    possible_notify_user_ids: z.array(z.number()).optional().nullable(),
    owner: CompanyOwnerSchema.optional().nullable(),
    next_task_name: z.string().optional().nullable(),
    next_task_id: z.number().optional().nullable(),
    next_task_due: z.string().optional().nullable(),
    next_task_all_day: z.boolean().optional().nullable(),
    next_entry_name: z.string().optional().nullable(),
    next_entry_id: z.number().optional().nullable(),
    next_entry_due: z.string().optional().nullable(),
    next_entry_all_day: z.boolean().optional().nullable(),
    tags: z.array(CompanyTagSchema).optional().nullable()
});

const OutputSchema = z.object({
    id: z.number().describe('Unique identifier of the created company.'),
    name: z.string().describe('The name of the company.'),
    description: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    web: z.string().optional().nullable(),
    fax: z.string().optional().nullable(),
    address_1: z.string().optional().nullable(),
    address_2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    facebook_url: z.string().optional().nullable(),
    linked_in_url: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    instant_message: z.string().optional().nullable(),
    phone1: z.string().optional().nullable(),
    phone2: z.string().optional().nullable(),
    phone3: z.string().optional().nullable(),
    phone4: z.string().optional().nullable(),
    phone1_desc: z.string().optional().nullable(),
    phone2_desc: z.string().optional().nullable(),
    phone3_desc: z.string().optional().nullable(),
    phone4_desc: z.string().optional().nullable(),
    owner_id: z.number().optional().nullable(),
    shared_user_ids: z.array(z.number()).optional().nullable(),
    tag_ids: z.array(z.number()).optional().nullable(),
    custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    image_thumb_url: z.string().optional().nullable(),
    image_mobile_url: z.string().optional().nullable(),
    possible_notify_user_ids: z.array(z.number()).optional().nullable(),
    owner: CompanyOwnerSchema.optional().nullable(),
    next_task_name: z.string().optional().nullable(),
    next_task_id: z.number().optional().nullable(),
    next_task_due: z.string().optional().nullable(),
    next_task_all_day: z.boolean().optional().nullable(),
    next_entry_name: z.string().optional().nullable(),
    next_entry_id: z.number().optional().nullable(),
    next_entry_due: z.string().optional().nullable(),
    next_entry_all_day: z.boolean().optional().nullable(),
    tags: z.array(CompanyTagSchema).optional().nullable()
});

function buildCompanyBody(input: z.infer<typeof InputSchema>): Record<string, unknown> {
    const body: Record<string, unknown> = {
        name: input.name
    };

    if (input.description !== undefined) {
        body['description'] = input.description;
    }
    if (input.email !== undefined) {
        body['email'] = input.email;
    }
    if (input.web !== undefined) {
        body['web'] = input.web;
    }
    if (input.fax !== undefined) {
        body['fax'] = input.fax;
    }
    if (input.address_1 !== undefined) {
        body['address_1'] = input.address_1;
    }
    if (input.address_2 !== undefined) {
        body['address_2'] = input.address_2;
    }
    if (input.city !== undefined) {
        body['city'] = input.city;
    }
    if (input.state !== undefined) {
        body['state'] = input.state;
    }
    if (input.postal_code !== undefined) {
        body['postal_code'] = input.postal_code;
    }
    if (input.country !== undefined) {
        body['country'] = input.country;
    }
    if (input.facebook_url !== undefined) {
        body['facebook_url'] = input.facebook_url;
    }
    if (input.linked_in_url !== undefined) {
        body['linked_in_url'] = input.linked_in_url;
    }
    if (input.twitter !== undefined) {
        body['twitter'] = input.twitter;
    }
    if (input.instant_message !== undefined) {
        body['instant_message'] = input.instant_message;
    }
    if (input.phone1 !== undefined) {
        body['phone1'] = input.phone1;
    }
    if (input.phone2 !== undefined) {
        body['phone2'] = input.phone2;
    }
    if (input.phone3 !== undefined) {
        body['phone3'] = input.phone3;
    }
    if (input.phone4 !== undefined) {
        body['phone4'] = input.phone4;
    }
    if (input.phone1_desc !== undefined) {
        body['phone1_desc'] = input.phone1_desc;
    }
    if (input.phone2_desc !== undefined) {
        body['phone2_desc'] = input.phone2_desc;
    }
    if (input.phone3_desc !== undefined) {
        body['phone3_desc'] = input.phone3_desc;
    }
    if (input.phone4_desc !== undefined) {
        body['phone4_desc'] = input.phone4_desc;
    }
    if (input.owner_id !== undefined) {
        body['owner_id'] = input.owner_id;
    }
    if (input.shared_user_ids !== undefined) {
        body['shared_user_ids'] = input.shared_user_ids;
    }
    if (input.tag_ids !== undefined) {
        body['tag_ids'] = input.tag_ids;
    }
    if (input.custom_fields !== undefined) {
        body['custom_fields'] = input.custom_fields;
    }

    return body;
}

const action = createAction({
    description: 'Create a new company in Pipeline CRM.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.post({
            endpoint: '/companies.json',
            baseUrlOverride: 'https://api.pipelinecrm.com/api/v3',
            data: {
                company: buildCompanyBody(input)
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Pipeline CRM API: response body is not an object.'
            });
        }

        const providerCompany = ProviderCompanySchema.parse(rawData);

        return {
            id: providerCompany.id,
            name: providerCompany.name,
            ...(providerCompany.description !== undefined && { description: providerCompany.description }),
            ...(providerCompany.email !== undefined && { email: providerCompany.email }),
            ...(providerCompany.web !== undefined && { web: providerCompany.web }),
            ...(providerCompany.fax !== undefined && { fax: providerCompany.fax }),
            ...(providerCompany.address_1 !== undefined && { address_1: providerCompany.address_1 }),
            ...(providerCompany.address_2 !== undefined && { address_2: providerCompany.address_2 }),
            ...(providerCompany.city !== undefined && { city: providerCompany.city }),
            ...(providerCompany.state !== undefined && { state: providerCompany.state }),
            ...(providerCompany.postal_code !== undefined && { postal_code: providerCompany.postal_code }),
            ...(providerCompany.country !== undefined && { country: providerCompany.country }),
            ...(providerCompany.facebook_url !== undefined && { facebook_url: providerCompany.facebook_url }),
            ...(providerCompany.linked_in_url !== undefined && { linked_in_url: providerCompany.linked_in_url }),
            ...(providerCompany.twitter !== undefined && { twitter: providerCompany.twitter }),
            ...(providerCompany.instant_message !== undefined && { instant_message: providerCompany.instant_message }),
            ...(providerCompany.phone1 !== undefined && { phone1: providerCompany.phone1 }),
            ...(providerCompany.phone2 !== undefined && { phone2: providerCompany.phone2 }),
            ...(providerCompany.phone3 !== undefined && { phone3: providerCompany.phone3 }),
            ...(providerCompany.phone4 !== undefined && { phone4: providerCompany.phone4 }),
            ...(providerCompany.phone1_desc !== undefined && { phone1_desc: providerCompany.phone1_desc }),
            ...(providerCompany.phone2_desc !== undefined && { phone2_desc: providerCompany.phone2_desc }),
            ...(providerCompany.phone3_desc !== undefined && { phone3_desc: providerCompany.phone3_desc }),
            ...(providerCompany.phone4_desc !== undefined && { phone4_desc: providerCompany.phone4_desc }),
            ...(providerCompany.owner_id !== undefined && { owner_id: providerCompany.owner_id }),
            ...(providerCompany.shared_user_ids !== undefined && { shared_user_ids: providerCompany.shared_user_ids }),
            ...(providerCompany.tag_ids !== undefined && { tag_ids: providerCompany.tag_ids }),
            ...(providerCompany.custom_fields !== undefined && { custom_fields: providerCompany.custom_fields }),
            ...(providerCompany.created_at !== undefined && { created_at: providerCompany.created_at }),
            ...(providerCompany.updated_at !== undefined && { updated_at: providerCompany.updated_at }),
            ...(providerCompany.image_thumb_url !== undefined && { image_thumb_url: providerCompany.image_thumb_url }),
            ...(providerCompany.image_mobile_url !== undefined && { image_mobile_url: providerCompany.image_mobile_url }),
            ...(providerCompany.possible_notify_user_ids !== undefined && { possible_notify_user_ids: providerCompany.possible_notify_user_ids }),
            ...(providerCompany.owner !== undefined && { owner: providerCompany.owner }),
            ...(providerCompany.next_task_name !== undefined && { next_task_name: providerCompany.next_task_name }),
            ...(providerCompany.next_task_id !== undefined && { next_task_id: providerCompany.next_task_id }),
            ...(providerCompany.next_task_due !== undefined && { next_task_due: providerCompany.next_task_due }),
            ...(providerCompany.next_task_all_day !== undefined && { next_task_all_day: providerCompany.next_task_all_day }),
            ...(providerCompany.next_entry_name !== undefined && { next_entry_name: providerCompany.next_entry_name }),
            ...(providerCompany.next_entry_id !== undefined && { next_entry_id: providerCompany.next_entry_id }),
            ...(providerCompany.next_entry_due !== undefined && { next_entry_due: providerCompany.next_entry_due }),
            ...(providerCompany.next_entry_all_day !== undefined && { next_entry_all_day: providerCompany.next_entry_all_day }),
            ...(providerCompany.tags !== undefined && { tags: providerCompany.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
