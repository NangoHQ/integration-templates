import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The ID of the activity. Example: 123')
});

const ProviderActivitySchema = z.object({
    id: z.number(),
    subject: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    owner_id: z.number().nullable().optional(),
    deal_id: z.number().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    person_id: z.number().nullable().optional(),
    org_id: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    due_date: z.string().nullable().optional(),
    due_time: z.string().nullable().optional(),
    duration: z.string().nullable().optional(),
    busy: z.boolean().nullable().optional(),
    done: z.boolean().nullable().optional(),
    location: z
        .object({
            value: z.string().nullable().optional(),
            country: z.string().nullable().optional(),
            admin_area_level_1: z.string().nullable().optional(),
            admin_area_level_2: z.string().nullable().optional(),
            locality: z.string().nullable().optional(),
            sublocality: z.string().nullable().optional(),
            route: z.string().nullable().optional(),
            street_number: z.string().nullable().optional(),
            subpremise: z.string().nullable().optional(),
            postal_code: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    public_description: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    note: z.string().nullable().optional(),
    add_time: z.string().nullable().optional(),
    update_time: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    subject: z.string().optional(),
    type: z.string().optional(),
    ownerId: z.number().optional(),
    dealId: z.number().optional(),
    leadId: z.string().optional(),
    personId: z.number().optional(),
    orgId: z.number().optional(),
    projectId: z.number().optional(),
    dueDate: z.string().optional(),
    dueTime: z.string().optional(),
    duration: z.string().optional(),
    busy: z.boolean().optional(),
    done: z.boolean().optional(),
    location: z
        .object({
            value: z.string().optional(),
            country: z.string().optional(),
            adminAreaLevel1: z.string().optional(),
            adminAreaLevel2: z.string().optional(),
            locality: z.string().optional(),
            sublocality: z.string().optional(),
            route: z.string().optional(),
            streetNumber: z.string().optional(),
            subpremise: z.string().optional(),
            postalCode: z.string().optional()
        })
        .optional(),
    publicDescription: z.string().optional(),
    priority: z.number().optional(),
    note: z.string().optional(),
    addTime: z.string().optional(),
    updateTime: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single activity from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-activity',
        group: 'Activities'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pipedrive.com/docs/api/v1/Activities#getActivity
        const response = await nango.get({
            endpoint: `/v1/activities/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Activity not found',
                id: input.id
            });
        }

        const providerActivity = ProviderActivitySchema.parse(response.data.data);

        return {
            id: providerActivity.id,
            ...(providerActivity.subject != null && {
                subject: providerActivity.subject
            }),
            ...(providerActivity.type != null && {
                type: providerActivity.type
            }),
            ...(providerActivity.owner_id != null && {
                ownerId: providerActivity.owner_id
            }),
            ...(providerActivity.deal_id != null && {
                dealId: providerActivity.deal_id
            }),
            ...(providerActivity.lead_id != null && {
                leadId: providerActivity.lead_id
            }),
            ...(providerActivity.person_id != null && {
                personId: providerActivity.person_id
            }),
            ...(providerActivity.org_id != null && {
                orgId: providerActivity.org_id
            }),
            ...(providerActivity.project_id != null && {
                projectId: providerActivity.project_id
            }),
            ...(providerActivity.due_date != null && {
                dueDate: providerActivity.due_date
            }),
            ...(providerActivity.due_time != null && {
                dueTime: providerActivity.due_time
            }),
            ...(providerActivity.duration != null && {
                duration: providerActivity.duration
            }),
            ...(providerActivity.busy != null && { busy: providerActivity.busy }),
            ...(providerActivity.done != null && { done: providerActivity.done }),
            ...(providerActivity.location != null && {
                location: {
                    ...(providerActivity.location.value != null && {
                        value: providerActivity.location.value
                    }),
                    ...(providerActivity.location.country != null && {
                        country: providerActivity.location.country
                    }),
                    ...(providerActivity.location.admin_area_level_1 != null && {
                        adminAreaLevel1: providerActivity.location.admin_area_level_1
                    }),
                    ...(providerActivity.location.admin_area_level_2 != null && {
                        adminAreaLevel2: providerActivity.location.admin_area_level_2
                    }),
                    ...(providerActivity.location.locality != null && {
                        locality: providerActivity.location.locality
                    }),
                    ...(providerActivity.location.sublocality != null && {
                        sublocality: providerActivity.location.sublocality
                    }),
                    ...(providerActivity.location.route != null && {
                        route: providerActivity.location.route
                    }),
                    ...(providerActivity.location.street_number != null && {
                        streetNumber: providerActivity.location.street_number
                    }),
                    ...(providerActivity.location.subpremise != null && {
                        subpremise: providerActivity.location.subpremise
                    }),
                    ...(providerActivity.location.postal_code != null && {
                        postalCode: providerActivity.location.postal_code
                    })
                }
            }),
            ...(providerActivity.public_description != null && {
                publicDescription: providerActivity.public_description
            }),
            ...(providerActivity.priority != null && {
                priority: providerActivity.priority
            }),
            ...(providerActivity.note != null && { note: providerActivity.note }),
            ...(providerActivity.add_time != null && {
                addTime: providerActivity.add_time
            }),
            ...(providerActivity.update_time != null && {
                updateTime: providerActivity.update_time
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
