import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the lead. Example: "e6e17c2f-1234-4567-890a-b1234567890c"')
});

const ProviderValueSchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        owner_id: z.number().optional(),
        creator_id: z.number().optional(),
        person_id: z.number().nullable().optional(),
        organization_id: z.number().nullable().optional(),
        value: ProviderValueSchema.nullable().optional(),
        expected_close_date: z.string().nullable().optional(),
        add_time: z.string().optional(),
        update_time: z.string().optional(),
        was_seen: z.boolean().optional(),
        is_archived: z.boolean().optional(),
        next_activity_id: z.number().nullable().optional(),
        label_ids: z.array(z.number()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    owner_id: z.number().optional(),
    creator_id: z.number().optional(),
    person_id: z.number().optional(),
    organization_id: z.number().optional(),
    value: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .optional(),
    expected_close_date: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    was_seen: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    next_activity_id: z.number().optional(),
    label_ids: z.array(z.number()).optional()
});

const action = createAction({
    description: 'Retrieve a single lead from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get connection to access the api_domain for Pipedrive
        const connection = await nango.getConnection();
        const baseUrlOverride = connection.connection_config?.['api_domain'];

        const response = await nango.get({
            // https://developers.pipedrive.com/docs/api/v1/Leads#getLead
            endpoint: `/api/v1/leads/${input.id}`,
            retries: 3,
            baseUrlOverride
        });

        if (!response.data?.success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to retrieve lead from Pipedrive API'
            });
        }

        const providerData = response.data.data;

        if (!providerData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead not found',
                id: input.id
            });
        }

        const lead = ProviderLeadSchema.parse(providerData);

        return {
            id: lead.id,
            title: lead.title,
            ...(lead.owner_id !== undefined && { owner_id: lead.owner_id }),
            ...(lead.creator_id !== undefined && { creator_id: lead.creator_id }),
            ...(lead.person_id != null && { person_id: lead.person_id }),
            ...(lead.organization_id != null && { organization_id: lead.organization_id }),
            ...(lead.value != null && { value: lead.value }),
            ...(lead.expected_close_date != null && { expected_close_date: lead.expected_close_date }),
            ...(lead.add_time !== undefined && { add_time: lead.add_time }),
            ...(lead.update_time !== undefined && { update_time: lead.update_time }),
            ...(lead.was_seen !== undefined && { was_seen: lead.was_seen }),
            ...(lead.is_archived !== undefined && { is_archived: lead.is_archived }),
            ...(lead.next_activity_id != null && { next_activity_id: lead.next_activity_id }),
            ...(lead.label_ids !== undefined && { label_ids: lead.label_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
