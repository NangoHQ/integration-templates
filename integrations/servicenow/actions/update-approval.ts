import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the approval record to update. Example: "6dd64ff9c3ca0310c5a8fc0d05013198"'),
    state: z.enum(['approved', 'rejected']).describe('The desired approval state.'),
    comments: z.string().optional().describe('Optional comments to add to the approval record.')
});

const ProviderApprovalSchema = z.object({
    sys_id: z.string(),
    state: z.string(),
    comments: z.string().nullable().optional(),
    sys_updated_on: z.string().nullable().optional(),
    document_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    state: z.string(),
    comments: z.string().optional(),
    sys_updated_on: z.string().optional(),
    document_id: z.string().optional()
});

const action = createAction({
    description: 'Approve or reject a pending approval.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/api/now/table/sysapproval_approver/${encodeURIComponent(input.sys_id)}`;
        const params = {
            sysparm_exclude_reference_link: 'true'
        };

        // `state` is a plain overwrite field, safe to retry.
        // https://developer.servicenow.com/dev.do#!/reference/api/now/table/sysapproval_approver
        let response = await nango.patch({
            endpoint,
            data: { state: input.state },
            params,
            retries: 1
        });

        // `comments` is a ServiceNow journal field: every PATCH appends a new entry
        // rather than overwriting. It must not be retried automatically, or a transient
        // failure followed by a retry can duplicate the comment.
        if (input.comments !== undefined) {
            response = await nango.patch({
                endpoint,
                data: { comments: input.comments },
                params,
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
        }

        const rawBody = response.data;
        if (!rawBody || typeof rawBody !== 'object' || !('result' in rawBody)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from ServiceNow',
                response: rawBody
            });
        }

        const providerApproval = ProviderApprovalSchema.parse(rawBody.result);

        return {
            sys_id: providerApproval.sys_id,
            state: providerApproval.state,
            ...(typeof providerApproval.comments === 'string' && { comments: providerApproval.comments }),
            ...(typeof providerApproval.sys_updated_on === 'string' && { sys_updated_on: providerApproval.sys_updated_on }),
            ...(typeof providerApproval.document_id === 'string' && { document_id: providerApproval.document_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
