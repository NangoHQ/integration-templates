import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ValueSchema = z.object({
    amount: z.number(),
    currency: z.string()
});

const InputSchema = z
    .object({
        title: z.string().describe('The name of the lead'),
        person_id: z.number().optional().describe('The ID of a person to link the lead to. Required unless organization_id is specified.'),
        organization_id: z.number().optional().describe('The ID of an organization to link the lead to. Required unless person_id is specified.'),
        owner_id: z.number().optional().describe('The ID of the user who will own the lead'),
        label_ids: z
            .array(z.union([z.string(), z.number()]))
            .optional()
            .describe('The IDs of lead labels to associate with the lead'),
        value: ValueSchema.optional().describe('The potential value of the lead'),
        expected_close_date: z.string().optional().describe('The expected close date in ISO 8601 format (YYYY-MM-DD)'),
        visible_to: z.string().optional().describe('The visibility of the lead'),
        was_seen: z.boolean().optional().describe('Whether the lead was seen in the Pipedrive UI'),
        origin_id: z.string().optional().describe('Optional ID to distinguish the origin of the lead'),
        channel: z.number().optional().describe('The ID of the marketing channel'),
        channel_id: z.string().optional().describe('Optional ID to further distinguish the marketing channel')
    })
    .refine((data) => data.person_id !== undefined || data.organization_id !== undefined, {
        message: 'Either person_id or organization_id is required',
        path: ['person_id']
    });

const ProviderLeadSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        owner_id: z.number().nullish(),
        creator_id: z.number().nullish(),
        label_ids: z.array(z.unknown()).optional(),
        person_id: z.number().nullish(),
        organization_id: z.number().nullish(),
        source_name: z.string().nullish(),
        source_origin: z.string().nullish(),
        value: z
            .object({
                amount: z.number(),
                currency: z.string()
            })
            .nullish(),
        expected_close_date: z.string().nullish(),
        visible_to: z.string().nullish(),
        was_seen: z.boolean().nullish(),
        next_activity_id: z.number().nullish(),
        add_time: z.string().nullish(),
        update_time: z.string().nullish(),
        is_archived: z.boolean().nullish()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        owner_id: z.number().optional(),
        creator_id: z.number().optional(),
        label_ids: z.array(z.unknown()).optional(),
        person_id: z.number().optional(),
        organization_id: z.number().optional(),
        source_name: z.string().optional(),
        source_origin: z.string().optional(),
        value: ValueSchema.optional(),
        expected_close_date: z.string().optional(),
        visible_to: z.string().optional(),
        was_seen: z.boolean().optional(),
        next_activity_id: z.number().optional(),
        add_time: z.string().optional(),
        update_time: z.string().optional(),
        is_archived: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a lead in Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-lead',
        group: 'Leads'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            title: input.title,
            ...(input.person_id !== undefined && { person_id: input.person_id }),
            ...(input.organization_id !== undefined && { organization_id: input.organization_id }),
            ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
            ...(input.label_ids !== undefined && { label_ids: input.label_ids }),
            ...(input.value !== undefined && { value: input.value }),
            ...(input.expected_close_date !== undefined && { expected_close_date: input.expected_close_date }),
            ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
            ...(input.was_seen !== undefined && { was_seen: input.was_seen }),
            ...(input.origin_id !== undefined && { origin_id: input.origin_id }),
            ...(input.channel !== undefined && { channel: input.channel }),
            ...(input.channel_id !== undefined && { channel_id: input.channel_id })
        };

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Leads#addLead
            endpoint: '/v1/leads',
            data,
            retries: 1
        };

        const response = await nango.post(config);

        const providerResponse = z
            .object({
                success: z.boolean(),
                data: z.unknown()
            })
            .parse(response.data);

        if (!providerResponse.success || providerResponse.data === null || typeof providerResponse.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Pipedrive API returned an unsuccessful response'
            });
        }

        const lead = ProviderLeadSchema.parse(providerResponse.data);

        const output: { id: string; title: string; [key: string]: unknown } = {
            id: lead.id,
            title: lead.title
        };

        for (const [key, value] of Object.entries(lead)) {
            if (key === 'id' || key === 'title') {
                continue;
            }
            if (value !== null && value !== undefined) {
                output[key] = value;
            }
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
