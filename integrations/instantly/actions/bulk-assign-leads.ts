import { z } from 'zod';
import { createAction } from 'nango';

const FilterEnum = z.enum([
    'FILTER_VAL_CONTACTED',
    'FILTER_VAL_NOT_CONTACTED',
    'FILTER_VAL_COMPLETED',
    'FILTER_VAL_UNSUBSCRIBED',
    'FILTER_VAL_ACTIVE',
    'FILTER_LEAD_INTERESTED',
    'FILTER_LEAD_NOT_INTERESTED',
    'FILTER_LEAD_MEETING_BOOKED',
    'FILTER_LEAD_MEETING_COMPLETED',
    'FILTER_LEAD_CLOSED',
    'FILTER_LEAD_OUT_OF_OFFICE',
    'FILTER_LEAD_WRONG_PERSON',
    'FILTER_LEAD_LOST',
    'FILTER_LEAD_NO_SHOW',
    'FILTER_LEAD_CUSTOM_LABEL_POSITIVE',
    'FILTER_LEAD_CUSTOM_LABEL_NEGATIVE',
    'FILTER_VAL_BOUNCED',
    'FILTER_VAL_SKIPPED',
    'FILTER_VAL_RISKY',
    'FILTER_VAL_INVALID',
    'FILTER_VAL_VALID',
    'FILTER_VAL_IN_SUBSEQUENCE',
    'FILTER_VAL_OPENED_NO_REPLY',
    'FILTER_VAL_COMPLETED_NO_REPLY',
    'FILTER_VAL_NO_OPENS',
    'FILTER_VAL_REPLIED',
    'FILTER_VAL_LINK_CLICKED'
]);

const InputSchema = z.object({
    organization_user_ids: z
        .array(z.string().uuid())
        .min(1)
        .describe('Array of organization user IDs to assign leads to. Example: ["019f1a45-a723-7e22-8a57-336ad585bbaa"]'),
    ids: z.array(z.string().uuid()).optional().describe('Specific lead IDs to assign. Example: ["019f1a45-a723-7e22-8a57-336cd2ecffe0"]'),
    campaign: z.string().uuid().optional().describe('Campaign ID to filter leads by. Example: "019f1a45-a723-7e22-8a57-336813395c1f"'),
    list_id: z.string().uuid().optional().describe('List ID to filter leads by. Example: "019f1a45-a723-7e22-8a57-33693d8d3f7e"'),
    search: z.string().optional().describe('Search query to filter leads by. Example: "test"'),
    filter: FilterEnum.optional().describe('Filter to apply to the leads. Example: "FILTER_LEAD_CLOSED"'),
    in_campaign: z.boolean().optional().describe('Whether the leads are in the campaign.'),
    in_list: z.boolean().optional().describe('Whether the leads are in the list.'),
    smart_view_id: z.string().uuid().optional().describe('Smart view ID to filter leads by. Example: "019f1a45-a723-7e22-8a57-336ba3fea9c9"'),
    limit: z.number().int().min(0).optional().describe('Maximum number of leads to assign. Example: 10'),
    assigned_to: z.string().uuid().optional().describe('Filter leads by their current owner. Example: "019f1a45-a723-7e22-8a57-336dd0df52c5"'),
    has_clause: z.boolean().optional().describe('Whether to apply filters from the web app.')
});

const ProviderResponseSchema = z.object({
    status: z.string().optional(),
    message: z.string().optional()
});

const ProviderErrorSchema = z.object({
    message: z.string().optional()
});

const OutputSchema = z.object({
    status: z.string(),
    message: z.string()
});

const action = createAction({
    description: 'Bulk assign leads to organization users.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/bulk-assign-leads',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            organization_user_ids: input.organization_user_ids
        };

        if (input.ids !== undefined) {
            body['ids'] = input.ids;
        }
        if (input.campaign !== undefined) {
            body['campaign'] = input.campaign;
        }
        if (input.list_id !== undefined) {
            body['list_id'] = input.list_id;
        }
        if (input.search !== undefined) {
            body['search'] = input.search;
        }
        if (input.filter !== undefined) {
            body['filter'] = input.filter;
        }
        if (input.in_campaign !== undefined) {
            body['in_campaign'] = input.in_campaign;
        }
        if (input.in_list !== undefined) {
            body['in_list'] = input.in_list;
        }
        if (input.smart_view_id !== undefined) {
            body['smart_view_id'] = input.smart_view_id;
        }
        if (input.limit !== undefined) {
            body['limit'] = input.limit;
        }
        if (input.assigned_to !== undefined) {
            body['assigned_to'] = input.assigned_to;
        }
        if (input.has_clause !== undefined) {
            body['has_clause'] = input.has_clause;
        }

        // https://developer.instantly.ai/api-reference/lead/bulk-assign-leads-to-organization-users
        const response = await nango.post({
            endpoint: '/v2/leads/bulk-assign',
            data: body,
            retries: 3
        });

        if (response.status >= 200 && response.status < 300) {
            const providerData = ProviderResponseSchema.parse(response.data);
            return {
                status: providerData.status || 'accepted',
                message: providerData.message || 'Your request will be processed in a background job'
            };
        }

        if (response.status === 400) {
            const errorData = ProviderErrorSchema.parse(response.data);
            throw new nango.ActionError({
                type: 'invalid_request',
                message: errorData.message || 'Invalid request'
            });
        }

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The requested resource was not found'
            });
        }

        if (response.status === 429) {
            throw new nango.ActionError({
                type: 'rate_limited',
                message: 'API rate limit exceeded'
            });
        }

        throw new nango.ActionError({
            type: 'unexpected_error',
            message: `Unexpected status code: ${response.status}`
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
