import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().optional().describe('Filter by candidate email.'),
    shortcode: z.string().optional().describe('Filter by job shortcode. Example: "9CD658E13E"'),
    stage: z.string().optional().describe('Filter by stage slug. Example: "interview"'),
    created_after: z.string().optional().describe('ISO timestamp filter for created_after.'),
    updated_after: z.string().optional().describe('ISO timestamp filter for updated_after.'),
    limit: z.number().int().min(1).max(100).optional().describe('Page size (max 100, default 50).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (the paging.next URL). Omit for the first page.')
});

const AccountSchema = z.object({
    subdomain: z.string(),
    name: z.string()
});

const JobSchema = z.object({
    shortcode: z.string(),
    title: z.string()
});

const ResumeMetadataSchema = z.object({
    filename: z.string().optional(),
    filetype: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CandidateSchema = z.object({
    id: z.string(),
    name: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    headline: z.string().nullable().optional(),
    account: AccountSchema.nullable().optional(),
    job: JobSchema.nullable().optional(),
    stage: z.string().nullable().optional(),
    stage_kind: z.string().nullable().optional(),
    disqualified: z.boolean().optional(),
    withdrew: z.boolean().optional(),
    disqualification_reason: z.string().nullable().optional(),
    sourced: z.boolean().optional(),
    profile_url: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    domain: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    hired_at: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    resume_metadata: ResumeMetadataSchema.nullable().optional()
});

const PagingSchema = z.object({
    next: z.string().optional()
});

const ProviderResponseSchema = z.object({
    candidates: z.array(CandidateSchema),
    paging: PagingSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(CandidateSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List candidates with optional job/stage/email/date filters.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input) => {
        const params: Record<string, string | number> = {};
        let endpoint = '/spi/v3/candidates';

        if (input.cursor) {
            if (!URL.canParse(input.cursor)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'The provided cursor is not a valid URL.'
                });
            }

            const cursorUrl = new URL(input.cursor);
            endpoint = cursorUrl.pathname;
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }

        if (input.email !== undefined) {
            params['email'] = input.email;
        }

        if (input.shortcode !== undefined) {
            params['shortcode'] = input.shortcode;
        }

        if (input.stage !== undefined) {
            params['stage'] = input.stage;
        }

        if (input.created_after !== undefined) {
            params['created_after'] = input.created_after;
        }

        if (input.updated_after !== undefined) {
            params['updated_after'] = input.updated_after;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        // https://workable.readme.io/reference/job-candidates-index.md
        const response = await nango.get({
            endpoint,
            params,
            retries: 3,
            retryOn: [404]
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.candidates,
            ...(providerResponse.paging?.next != null && { next_cursor: providerResponse.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
