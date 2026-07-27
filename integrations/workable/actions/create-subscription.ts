import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    target: z.string().describe('The URL of the endpoint to push notifications at'),
    event: z.enum([
        'candidate_created',
        'candidate_moved',
        'candidate_deleted',
        'job_deleted',
        'employee_created',
        'employee_updated',
        'employee_published',
        'onboarding_completed',
        'timeoff_updated',
        'timeoff_request_approved',
        'timeoff_request_reverted'
    ]),
    args: z
        .object({
            account_id: z.string().describe("The subdomain of the account. e.g. 'nangodev'"),
            job_shortcode: z.string().optional().describe("Filter to one job. Use '' for all jobs. Only applies to candidate events."),
            stage_slug: z.string().optional().describe("Filter to one stage. Use '' for all stages. Only applies to candidate events.")
        })
        .optional()
});

const ProviderSubscriptionSchema = z.object({
    id: z.number()
});

function getErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    if ('status' in error && typeof error.status === 'number') {
        return error.status;
    }
    if ('response' in error && typeof error.response === 'object' && error.response !== null && 'status' in error.response) {
        const status = error.response.status;
        return typeof status === 'number' ? status : undefined;
    }
    return undefined;
}

const OutputSchema = z.object({
    id: z.number()
});

const action = createAction({
    description: 'Subscribe a target URL to a Workable event',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            target: string;
            event: string;
            args?: {
                account_id: string;
                job_shortcode?: string;
                stage_slug?: string;
            };
        } = {
            target: input.target,
            event: input.event
        };

        if (input.args !== undefined) {
            requestBody.args = {
                account_id: input.args.account_id,
                ...(input.args.job_shortcode !== undefined && { job_shortcode: input.args.job_shortcode }),
                ...(input.args.stage_slug !== undefined && { stage_slug: input.args.stage_slug })
            };
        }

        let response;

        // @allowTryCatch Convert provider-level 409 conflict into a typed ActionError so callers get a clear message.
        try {
            // https://workable.readme.io/reference/webhook-subscriptions.md
            response = await nango.post({
                endpoint: '/spi/v3/subscriptions',
                data: requestBody,
                retries: 1
            });
        } catch (err) {
            const status = getErrorStatus(err);
            if (status === 409) {
                throw new nango.ActionError({
                    type: 'conflict',
                    message: 'The target URL is already registered for this event.'
                });
            }
            throw err;
        }

        const subscription = ProviderSubscriptionSchema.parse(response.data);

        return {
            id: subscription.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
