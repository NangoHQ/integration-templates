import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the lead to update. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
    title: z.string().optional().describe('The name of the lead'),
    owner_id: z.number().optional().describe('The ID of the user which will be the owner of the lead'),
    label_ids: z.array(z.string()).optional().describe('The IDs of the lead labels which will be associated with the lead'),
    person_id: z.number().nullable().optional().describe('The ID of a person which this lead will be linked to. Set to null to unlink.'),
    organization_id: z.number().nullable().optional().describe('The ID of an organization which this lead will be linked to. Set to null to unlink.'),
    is_archived: z.boolean().optional().describe('A flag indicating whether the lead is archived'),
    value: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .nullable()
        .optional()
        .describe('The potential value of the lead. Set to null to clear.'),
    expected_close_date: z.string().nullable().optional().describe('The expected close date in ISO 8601 format (YYYY-MM-DD). Set to null to clear.'),
    visible_to: z.string().optional().describe('The visibility of the lead'),
    was_seen: z.boolean().optional().describe('A flag indicating whether the lead was seen by someone in the Pipedrive UI'),
    channel: z.number().nullable().optional().describe('The ID of Marketing channel this lead was created from. Set to null to clear.'),
    channel_id: z.string().nullable().optional().describe('The optional ID to further distinguish the Marketing channel. Set to null to clear.')
});

const ValueSchema = z
    .object({
        amount: z.number(),
        currency: z.string()
    })
    .nullable()
    .optional();

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        title: z.string().optional(),
        owner_id: z.number().optional(),
        creator_id: z.number().optional(),
        label_ids: z.array(z.string()).optional(),
        person_id: z.number().nullable().optional(),
        organization_id: z.number().nullable().optional(),
        is_archived: z.boolean().optional(),
        value: ValueSchema,
        expected_close_date: z.string().nullable().optional(),
        visible_to: z.string().optional(),
        was_seen: z.boolean().optional(),
        channel: z.number().nullable().optional(),
        channel_id: z.string().nullable().optional(),
        add_time: z.string().optional(),
        update_time: z.string().optional(),
        notes: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    owner_id: z.number().optional(),
    creator_id: z.number().optional(),
    label_ids: z.array(z.string()).optional(),
    person_id: z.number().optional(),
    organization_id: z.number().optional(),
    is_archived: z.boolean().optional(),
    value: ValueSchema,
    expected_close_date: z.string().optional(),
    visible_to: z.string().optional(),
    was_seen: z.boolean().optional(),
    channel: z.number().optional(),
    channel_id: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    notes: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Update a lead in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-lead'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full:write'],

    exec: async (nango, input) => {
        // Build the update payload - only include fields that are provided
        const updateData: Record<string, unknown> = {};

        if (input.title !== undefined) {
            updateData['title'] = input.title;
        }
        if (input.owner_id !== undefined) {
            updateData['owner_id'] = input.owner_id;
        }
        if (input.label_ids !== undefined) {
            updateData['label_ids'] = input.label_ids;
        }
        if (input.person_id !== undefined) {
            updateData['person_id'] = input.person_id;
        }
        if (input.organization_id !== undefined) {
            updateData['organization_id'] = input.organization_id;
        }
        if (input.is_archived !== undefined) {
            updateData['is_archived'] = input.is_archived;
        }
        if (input.value !== undefined) {
            updateData['value'] = input.value;
        }
        if (input.expected_close_date !== undefined) {
            updateData['expected_close_date'] = input.expected_close_date;
        }
        if (input.visible_to !== undefined) {
            updateData['visible_to'] = input.visible_to;
        }
        if (input.was_seen !== undefined) {
            updateData['was_seen'] = input.was_seen;
        }
        if (input.channel !== undefined) {
            updateData['channel'] = input.channel;
        }
        if (input.channel_id !== undefined) {
            updateData['channel_id'] = input.channel_id;
        }

        // https://developers.pipedrive.com/docs/api/v1/Leads#updateLead
        const response = await nango.patch({
            endpoint: `/v1/leads/${input.id}`,
            data: updateData,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead not found or update failed',
                id: input.id
            });
        }

        const providerLead = ProviderLeadSchema.parse(response.data.data);

        return {
            id: providerLead.id,
            ...(providerLead.title !== undefined && { title: providerLead.title }),
            ...(providerLead.owner_id !== undefined && { owner_id: providerLead.owner_id }),
            ...(providerLead.creator_id !== undefined && { creator_id: providerLead.creator_id }),
            ...(providerLead.label_ids !== undefined && { label_ids: providerLead.label_ids }),
            ...(providerLead.person_id != null && { person_id: providerLead.person_id }),
            ...(providerLead.organization_id != null && { organization_id: providerLead.organization_id }),
            ...(providerLead.is_archived !== undefined && { is_archived: providerLead.is_archived }),
            ...(providerLead.value != null && { value: providerLead.value }),
            ...(providerLead.expected_close_date != null && { expected_close_date: providerLead.expected_close_date }),
            ...(providerLead.visible_to !== undefined && { visible_to: providerLead.visible_to }),
            ...(providerLead.was_seen !== undefined && { was_seen: providerLead.was_seen }),
            ...(providerLead.channel != null && { channel: providerLead.channel }),
            ...(providerLead.channel_id != null && { channel_id: providerLead.channel_id }),
            ...(providerLead.add_time !== undefined && { add_time: providerLead.add_time }),
            ...(providerLead.update_time !== undefined && { update_time: providerLead.update_time }),
            ...(providerLead.notes !== undefined && { notes: providerLead.notes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
