import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Person ID. Example: 1309859835')
});

const ProviderPersonSchema = z
    .object({
        id: z.number(),
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        full_name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        email2: z.string().nullable().optional(),
        home_email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        home_phone: z.string().nullable().optional(),
        mobile: z.string().nullable().optional(),
        fax: z.string().nullable().optional(),
        position: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        summary: z.string().nullable().optional(),
        company_id: z.number().nullable().optional(),
        company_name: z.string().nullable().optional(),
        user_id: z.number().nullable().optional(),
        lead_status_id: z.number().nullable().optional(),
        lead_source_id: z.number().nullable().optional(),
        image_thumb_url: z.string().nullable().optional(),
        image_mobile_url: z.string().nullable().optional(),
        work_address_1: z.string().nullable().optional(),
        work_address_2: z.string().nullable().optional(),
        work_city: z.string().nullable().optional(),
        work_state: z.string().nullable().optional(),
        work_postal_code: z.string().nullable().optional(),
        work_country: z.string().nullable().optional(),
        home_address_1: z.string().nullable().optional(),
        home_address_2: z.string().nullable().optional(),
        home_city: z.string().nullable().optional(),
        home_state: z.string().nullable().optional(),
        home_postal_code: z.string().nullable().optional(),
        home_country: z.string().nullable().optional(),
        facebook_url: z.string().nullable().optional(),
        linked_in_url: z.string().nullable().optional(),
        twitter: z.string().nullable().optional(),
        instant_message: z.string().nullable().optional(),
        unsubscribed: z.boolean().nullable().optional(),
        bounced: z.boolean().nullable().optional(),
        is_key_contact: z.boolean().nullable().optional(),
        relationship: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        updated_at: z.string().nullable().optional(),
        viewed_at: z.string().nullable().optional(),
        last_emailed_at: z.string().nullable().optional(),
        created_by_user_id: z.number().nullable().optional(),
        next_entry_due: z.string().nullable().optional(),
        next_entry_all_day: z.boolean().nullable().optional(),
        next_entry_name: z.string().nullable().optional(),
        next_entry_id: z.number().nullable().optional(),
        owner: z.string().nullable().optional(),
        deal_ids: z.array(z.number()).nullable().optional(),
        shared_user_ids: z.array(z.number()).nullable().optional(),
        project_shared_user_ids: z.array(z.number()).nullable().optional(),
        predefined_contacts_tag_ids: z.array(z.number()).nullable().optional(),
        predefined_contacts_tags: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        possible_notify_user_ids: z.array(z.number()).nullable().optional(),
        custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
        user: z.record(z.string(), z.unknown()).nullable().optional(),
        company: z.record(z.string(), z.unknown()).nullable().optional(),
        created_by_user: z.record(z.string(), z.unknown()).nullable().optional(),
        lead_status: z.record(z.string(), z.unknown()).nullable().optional(),
        lead_source: z.record(z.string(), z.unknown()).nullable().optional(),
        currency: z.record(z.string(), z.unknown()).nullable().optional(),
        deals: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        date_of_first_activity: z.string().nullable().optional(),
        days_since_last_activity: z.number().nullable().optional(),
        hours_to_first_activity: z.number().nullable().optional(),
        total_pipeline: z.number().nullable().optional(),
        won_deals_total: z.number().nullable().optional(),
        work_address_google_maps_url: z.string().nullable().optional(),
        home_address_google_maps_url: z.string().nullable().optional(),
        company_address_google_maps_url: z.string().nullable().optional(),
        has_work_address: z.boolean().nullable().optional(),
        has_home_address: z.boolean().nullable().optional(),
        has_company_address: z.boolean().nullable().optional(),
        company_address_1: z.string().nullable().optional(),
        company_address_2: z.string().nullable().optional(),
        company_city: z.string().nullable().optional(),
        company_country: z.string().nullable().optional(),
        company_postal_code: z.string().nullable().optional(),
        company_state: z.string().nullable().optional(),
        is_sample: z.boolean().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.record(z.string(), z.unknown());

const action = createAction({
    description: 'Get a single person by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/people/${encodeURIComponent(input.id)}.json`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Person not found for id ${input.id}`
            });
        }

        const person = ProviderPersonSchema.parse(response.data);
        return person;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
