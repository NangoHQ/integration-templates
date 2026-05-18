import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the deal. Example: 123')
});

const ProviderDealSchema = z
    .object({
        id: z.number(),
        title: z.string().optional().nullable(),
        value: z.number().optional().nullable(),
        currency: z.string().optional().nullable(),
        user_id: z.number().optional().nullable(),
        person_id: z.number().optional().nullable(),
        org_id: z.number().optional().nullable(),
        stage_id: z.number().optional().nullable(),
        pipeline_id: z.number().optional().nullable(),
        status: z.string().optional().nullable(),
        add_time: z.string().optional().nullable(),
        update_time: z.string().optional().nullable(),
        next_activity_date: z.string().optional().nullable(),
        next_activity_time: z.string().optional().nullable(),
        next_activity_id: z.number().optional().nullable(),
        last_activity_id: z.number().optional().nullable(),
        last_activity_date: z.string().optional().nullable(),
        lost_reason: z.string().optional().nullable(),
        close_time: z.string().optional().nullable(),
        won_time: z.string().optional().nullable(),
        first_won_time: z.string().optional().nullable(),
        lost_time: z.string().optional().nullable(),
        probability: z.number().optional().nullable(),
        products_count: z.number().optional().nullable(),
        files_count: z.number().optional().nullable(),
        notes_count: z.number().optional().nullable(),
        followers_count: z.number().optional().nullable(),
        email_messages_count: z.number().optional().nullable(),
        activities_count: z.number().optional().nullable(),
        done_activities_count: z.number().optional().nullable(),
        undone_activities_count: z.number().optional().nullable(),
        participants_count: z.number().optional().nullable(),
        expected_close_date: z.string().optional().nullable(),
        cc_email: z.string().optional().nullable(),
        org_name: z.string().optional().nullable(),
        person_name: z.string().optional().nullable(),
        owner_name: z.string().optional().nullable(),
        origin: z.string().optional().nullable(),
        origin_id: z.union([z.number(), z.string()]).optional().nullable(),
        is_archived: z.boolean().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    value: z.number().optional(),
    currency: z.string().optional(),
    user_id: z.number().optional(),
    person_id: z.number().optional(),
    org_id: z.number().optional(),
    stage_id: z.number().optional(),
    pipeline_id: z.number().optional(),
    status: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    next_activity_date: z.string().optional(),
    next_activity_time: z.string().optional(),
    next_activity_id: z.number().optional(),
    last_activity_id: z.number().optional(),
    last_activity_date: z.string().optional(),
    lost_reason: z.string().optional(),
    close_time: z.string().optional(),
    won_time: z.string().optional(),
    first_won_time: z.string().optional(),
    lost_time: z.string().optional(),
    probability: z.number().optional(),
    products_count: z.number().optional(),
    files_count: z.number().optional(),
    notes_count: z.number().optional(),
    followers_count: z.number().optional(),
    email_messages_count: z.number().optional(),
    activities_count: z.number().optional(),
    done_activities_count: z.number().optional(),
    undone_activities_count: z.number().optional(),
    participants_count: z.number().optional(),
    expected_close_date: z.string().optional(),
    cc_email: z.string().optional(),
    org_name: z.string().optional(),
    person_name: z.string().optional(),
    owner_name: z.string().optional(),
    origin: z.string().optional(),
    origin_id: z.string().optional(),
    is_archived: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single deal from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-deal',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Deals#getDeal
            endpoint: `/v2/deals/${input.id}`,
            retries: 3
        });

        // Pipedrive API wraps response in { success: boolean, data: {...}, additional_data: ... }
        const ResponseWrapperSchema = z.object({
            success: z.boolean().optional(),
            data: z.unknown().optional(),
            additional_data: z.unknown().optional()
        });

        const responseWrapper = ResponseWrapperSchema.safeParse(response.data).data;

        if (!responseWrapper?.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found',
                id: input.id
            });
        }

        const providerDeal = ProviderDealSchema.parse(responseWrapper.data);

        // Helper to convert null to undefined for normalization
        const normalize = <T>(value: T | null | undefined): T | undefined => {
            return value === null ? undefined : value;
        };

        return {
            id: providerDeal.id,
            title: normalize(providerDeal.title),
            value: normalize(providerDeal.value),
            currency: normalize(providerDeal.currency),
            user_id: normalize(providerDeal.user_id),
            person_id: normalize(providerDeal.person_id),
            org_id: normalize(providerDeal.org_id),
            stage_id: normalize(providerDeal.stage_id),
            pipeline_id: normalize(providerDeal.pipeline_id),
            status: normalize(providerDeal.status),
            add_time: normalize(providerDeal.add_time),
            update_time: normalize(providerDeal.update_time),
            next_activity_date: normalize(providerDeal.next_activity_date),
            next_activity_time: normalize(providerDeal.next_activity_time),
            next_activity_id: normalize(providerDeal.next_activity_id),
            last_activity_id: normalize(providerDeal.last_activity_id),
            last_activity_date: normalize(providerDeal.last_activity_date),
            lost_reason: normalize(providerDeal.lost_reason),
            close_time: normalize(providerDeal.close_time),
            won_time: normalize(providerDeal.won_time),
            first_won_time: normalize(providerDeal.first_won_time),
            lost_time: normalize(providerDeal.lost_time),
            probability: normalize(providerDeal.probability),
            products_count: normalize(providerDeal.products_count),
            files_count: normalize(providerDeal.files_count),
            notes_count: normalize(providerDeal.notes_count),
            followers_count: normalize(providerDeal.followers_count),
            email_messages_count: normalize(providerDeal.email_messages_count),
            activities_count: normalize(providerDeal.activities_count),
            done_activities_count: normalize(providerDeal.done_activities_count),
            undone_activities_count: normalize(providerDeal.undone_activities_count),
            participants_count: normalize(providerDeal.participants_count),
            expected_close_date: normalize(providerDeal.expected_close_date),
            cc_email: normalize(providerDeal.cc_email),
            org_name: normalize(providerDeal.org_name),
            person_name: normalize(providerDeal.person_name),
            owner_name: normalize(providerDeal.owner_name),
            origin: normalize(providerDeal.origin),
            // origin_id can be string or number from provider, normalize to string
            origin_id: providerDeal.origin_id != null ? String(providerDeal.origin_id) : undefined,
            is_archived: normalize(providerDeal.is_archived)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
