import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    title: z.string().optional(),
    organization_name: z.string().optional(),
    account_id: z.string().optional(),
    website_url: z.string().optional(),
    label_names: z.array(z.string()).optional(),
    contact_stage_id: z.string().optional(),
    present_raw_address: z.string().optional(),
    direct_phone: z.string().optional(),
    corporate_phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    home_phone: z.string().optional(),
    other_phone: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    run_dedupe: z.boolean().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    organization_name: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    website_url: z.string().nullable().optional(),
    label_names: z.array(z.string()).nullable().optional(),
    contact_stage_id: z.string().nullable().optional(),
    present_raw_address: z.string().nullable().optional(),
    direct_phone: z.string().nullable().optional(),
    corporate_phone: z.string().nullable().optional(),
    mobile_phone: z.string().nullable().optional(),
    home_phone: z.string().nullable().optional(),
    other_phone: z.string().nullable().optional(),
    typed_custom_fields: z.any().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    organization_name: z.string().optional(),
    account_id: z.string().optional(),
    website_url: z.string().optional(),
    label_names: z.array(z.string()).optional(),
    contact_stage_id: z.string().optional(),
    present_raw_address: z.string().optional(),
    direct_phone: z.string().optional(),
    corporate_phone: z.string().optional(),
    mobile_phone: z.string().optional(),
    home_phone: z.string().optional(),
    other_phone: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a contact in Apollo.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email
        };

        if (input.title !== undefined) {
            data['title'] = input.title;
        }
        if (input.organization_name !== undefined) {
            data['organization_name'] = input.organization_name;
        }
        if (input.account_id !== undefined) {
            data['account_id'] = input.account_id;
        }
        if (input.website_url !== undefined) {
            data['website_url'] = input.website_url;
        }
        if (input.label_names !== undefined) {
            data['label_names'] = input.label_names;
        }
        if (input.contact_stage_id !== undefined) {
            data['contact_stage_id'] = input.contact_stage_id;
        }
        if (input.present_raw_address !== undefined) {
            data['present_raw_address'] = input.present_raw_address;
        }
        if (input.direct_phone !== undefined) {
            data['direct_phone'] = input.direct_phone;
        }
        if (input.corporate_phone !== undefined) {
            data['corporate_phone'] = input.corporate_phone;
        }
        if (input.mobile_phone !== undefined) {
            data['mobile_phone'] = input.mobile_phone;
        }
        if (input.home_phone !== undefined) {
            data['home_phone'] = input.home_phone;
        }
        if (input.other_phone !== undefined) {
            data['other_phone'] = input.other_phone;
        }
        if (input.typed_custom_fields !== undefined) {
            data['typed_custom_fields'] = input.typed_custom_fields;
        }
        if (input.run_dedupe !== undefined) {
            data['run_dedupe'] = input.run_dedupe;
        }

        // https://docs.apollo.io/reference/create-a-contact
        const response = await nango.post({
            endpoint: '/v1/contacts',
            data: data,
            retries: 3
        });

        const responseData = z.object({ contact: ProviderContactSchema }).parse(response.data);
        const contact = responseData.contact;

        return {
            id: contact.id,
            ...(contact.first_name != null && { first_name: contact.first_name }),
            ...(contact.last_name != null && { last_name: contact.last_name }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.title != null && { title: contact.title }),
            ...(contact.organization_name != null && { organization_name: contact.organization_name }),
            ...(contact.account_id != null && { account_id: contact.account_id }),
            ...(contact.website_url != null && { website_url: contact.website_url }),
            ...(contact.label_names != null && { label_names: contact.label_names }),
            ...(contact.contact_stage_id != null && { contact_stage_id: contact.contact_stage_id }),
            ...(contact.present_raw_address != null && { present_raw_address: contact.present_raw_address }),
            ...(contact.direct_phone != null && { direct_phone: contact.direct_phone }),
            ...(contact.corporate_phone != null && { corporate_phone: contact.corporate_phone }),
            ...(contact.mobile_phone != null && { mobile_phone: contact.mobile_phone }),
            ...(contact.home_phone != null && { home_phone: contact.home_phone }),
            ...(contact.other_phone != null && { other_phone: contact.other_phone }),
            ...(contact.typed_custom_fields != null && { typed_custom_fields: contact.typed_custom_fields }),
            ...(contact.created_at != null && { created_at: contact.created_at }),
            ...(contact.updated_at != null && { updated_at: contact.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
