import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the organization to retrieve. Example: 123')
});

const ProviderAddressSchema = z.union([
    z
        .object({
            value: z.string().optional().nullable(),
            country: z.string().optional().nullable(),
            admin_area_level_1: z.string().optional().nullable(),
            admin_area_level_2: z.string().optional().nullable(),
            locality: z.string().optional().nullable(),
            sublocality: z.string().optional().nullable(),
            route: z.string().optional().nullable(),
            street_number: z.string().optional().nullable(),
            subpremise: z.string().optional().nullable(),
            postal_code: z.string().optional().nullable()
        })
        .passthrough(),
    z.string()
]);

const ProviderOwnerSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        has_pic: z.number().optional().nullable(),
        pic_hash: z.string().optional().nullable(),
        active_flag: z.boolean().optional().nullable(),
        value: z.number().optional().nullable()
    })
    .passthrough();

const ProviderOrganizationSchema = z
    .object({
        id: z.number(),
        name: z.string().optional().nullable(),
        owner_id: z.union([z.number(), ProviderOwnerSchema]).optional().nullable(),
        add_time: z.string().optional().nullable(),
        update_time: z.string().optional().nullable(),
        visible_to: z.string().optional().nullable(),
        label_ids: z.array(z.number()).optional().nullable(),
        address: ProviderAddressSchema.optional().nullable(),
        people_count: z.number().optional().nullable(),
        open_deals_count: z.number().optional().nullable(),
        closed_deals_count: z.number().optional().nullable(),
        won_deals_count: z.number().optional().nullable(),
        lost_deals_count: z.number().optional().nullable(),
        activities_count: z.number().optional().nullable(),
        done_activities_count: z.number().optional().nullable(),
        undone_activities_count: z.number().optional().nullable(),
        email_messages_count: z.number().optional().nullable(),
        files_count: z.number().optional().nullable(),
        notes_count: z.number().optional().nullable(),
        followers_count: z.number().optional().nullable(),
        last_activity_id: z.number().optional().nullable(),
        next_activity_id: z.number().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderOrganizationSchema.optional().nullable()
});

const OutputAddressSchema = z.object({
    value: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    admin_area_level_1: z.string().optional().nullable(),
    admin_area_level_2: z.string().optional().nullable(),
    locality: z.string().optional().nullable(),
    sublocality: z.string().optional().nullable(),
    route: z.string().optional().nullable(),
    street_number: z.string().optional().nullable(),
    subpremise: z.string().optional().nullable(),
    postal_code: z.string().optional().nullable()
});

const OutputOwnerSchema = z.object({
    id: z.number(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    has_pic: z.number().optional().nullable(),
    pic_hash: z.string().optional().nullable(),
    active_flag: z.boolean().optional().nullable(),
    value: z.number().optional().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    owner_id: z.union([z.number(), OutputOwnerSchema]).optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    visible_to: z.string().optional(),
    label_ids: z.array(z.number()).optional(),
    address: z.union([OutputAddressSchema, z.string()]).optional(),
    people_count: z.number().optional(),
    open_deals_count: z.number().optional(),
    closed_deals_count: z.number().optional(),
    won_deals_count: z.number().optional(),
    lost_deals_count: z.number().optional(),
    activities_count: z.number().optional(),
    done_activities_count: z.number().optional(),
    undone_activities_count: z.number().optional(),
    email_messages_count: z.number().optional(),
    files_count: z.number().optional(),
    notes_count: z.number().optional(),
    followers_count: z.number().optional(),
    last_activity_id: z.number().optional(),
    next_activity_id: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a single organization from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Organizations#getOrganization
        const response = await nango.get({
            endpoint: `/v1/organizations/${input.id}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success || !parsed.data.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve organization from Pipedrive',
                details: parsed.error?.message
            });
        }

        const org = parsed.data.data;

        if (!org) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Organization with ID ${input.id} not found`
            });
        }

        return {
            id: org.id,
            ...(org.name != null && { name: org.name }),
            ...(org.owner_id != null && { owner_id: org.owner_id }),
            ...(org.add_time != null && { add_time: org.add_time }),
            ...(org.update_time != null && { update_time: org.update_time }),
            ...(org.visible_to != null && { visible_to: org.visible_to }),
            ...(org.label_ids != null && { label_ids: org.label_ids }),
            ...(org.address != null && { address: org.address }),
            ...(org.people_count != null && { people_count: org.people_count }),
            ...(org.open_deals_count != null && { open_deals_count: org.open_deals_count }),
            ...(org.closed_deals_count != null && { closed_deals_count: org.closed_deals_count }),
            ...(org.won_deals_count != null && { won_deals_count: org.won_deals_count }),
            ...(org.lost_deals_count != null && { lost_deals_count: org.lost_deals_count }),
            ...(org.activities_count != null && { activities_count: org.activities_count }),
            ...(org.done_activities_count != null && { done_activities_count: org.done_activities_count }),
            ...(org.undone_activities_count != null && { undone_activities_count: org.undone_activities_count }),
            ...(org.email_messages_count != null && { email_messages_count: org.email_messages_count }),
            ...(org.files_count != null && { files_count: org.files_count }),
            ...(org.notes_count != null && { notes_count: org.notes_count }),
            ...(org.followers_count != null && { followers_count: org.followers_count }),
            ...(org.last_activity_id != null && { last_activity_id: org.last_activity_id }),
            ...(org.next_activity_id != null && { next_activity_id: org.next_activity_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
