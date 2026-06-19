import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the contact to retrieve. Example: "6a0af1f3f1ce1100203b8047"')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    organization_name: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    contact_stage_id: z.string().nullable().optional(),
    owner_id: z.string().nullable().optional(),
    creator_id: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    original_source: z.string().nullable().optional(),
    headline: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    present_raw_address: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    email_status: z.string().nullable().optional(),
    sanitized_phone: z.string().nullable().optional(),
    existence_level: z.string().nullable().optional(),
    twitter_url: z.string().nullable().optional(),
    label_ids: z.array(z.string()).optional(),
    contact_roles: z.array(z.unknown()).optional(),
    emailer_campaign_ids: z.array(z.string()).optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    organization_name: z.string().optional(),
    organization_id: z.string().optional(),
    account_id: z.string().optional(),
    linkedin_url: z.string().optional(),
    contact_stage_id: z.string().optional(),
    owner_id: z.string().optional(),
    creator_id: z.string().optional(),
    source: z.string().optional(),
    original_source: z.string().optional(),
    headline: z.string().optional(),
    photo_url: z.string().optional(),
    present_raw_address: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    email_status: z.string().optional(),
    sanitized_phone: z.string().optional(),
    existence_level: z.string().optional(),
    twitter_url: z.string().optional(),
    label_ids: z.array(z.string()).optional(),
    contact_roles: z.array(z.unknown()).optional(),
    emailer_campaign_ids: z.array(z.string()).optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single contact from Apollo.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/view-a-contact
        const response = await nango.get({
            endpoint: `/v1/contacts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || !response.data.contact) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                id: input.id
            });
        }

        const providerContact = ProviderContactSchema.parse(response.data.contact);

        return {
            id: providerContact.id,
            ...(providerContact.first_name != null && { first_name: providerContact.first_name }),
            ...(providerContact.last_name != null && { last_name: providerContact.last_name }),
            ...(providerContact.name != null && { name: providerContact.name }),
            ...(providerContact.email != null && { email: providerContact.email }),
            ...(providerContact.title != null && { title: providerContact.title }),
            ...(providerContact.organization_name != null && { organization_name: providerContact.organization_name }),
            ...(providerContact.organization_id != null && { organization_id: providerContact.organization_id }),
            ...(providerContact.account_id != null && { account_id: providerContact.account_id }),
            ...(providerContact.linkedin_url != null && { linkedin_url: providerContact.linkedin_url }),
            ...(providerContact.contact_stage_id != null && { contact_stage_id: providerContact.contact_stage_id }),
            ...(providerContact.owner_id != null && { owner_id: providerContact.owner_id }),
            ...(providerContact.creator_id != null && { creator_id: providerContact.creator_id }),
            ...(providerContact.source != null && { source: providerContact.source }),
            ...(providerContact.original_source != null && { original_source: providerContact.original_source }),
            ...(providerContact.headline != null && { headline: providerContact.headline }),
            ...(providerContact.photo_url != null && { photo_url: providerContact.photo_url }),
            ...(providerContact.present_raw_address != null && { present_raw_address: providerContact.present_raw_address }),
            ...(providerContact.created_at != null && { created_at: providerContact.created_at }),
            ...(providerContact.updated_at != null && { updated_at: providerContact.updated_at }),
            ...(providerContact.email_status != null && { email_status: providerContact.email_status }),
            ...(providerContact.sanitized_phone != null && { sanitized_phone: providerContact.sanitized_phone }),
            ...(providerContact.existence_level != null && { existence_level: providerContact.existence_level }),
            ...(providerContact.twitter_url != null && { twitter_url: providerContact.twitter_url }),
            ...(providerContact.label_ids !== undefined && { label_ids: providerContact.label_ids }),
            ...(providerContact.contact_roles !== undefined && { contact_roles: providerContact.contact_roles }),
            ...(providerContact.emailer_campaign_ids !== undefined && { emailer_campaign_ids: providerContact.emailer_campaign_ids }),
            ...(providerContact.typed_custom_fields !== undefined && { typed_custom_fields: providerContact.typed_custom_fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
