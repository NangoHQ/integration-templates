import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    state: z.string().optional().describe('Filter by requisition state. Example: "pending"'),
    job_id: z.string().optional().describe('Filter by job ID. Example: "23c47225"'),
    plan_date_from: z.string().optional().describe('Filter by plan date from (YYYY-MM). Example: "2022-01"'),
    plan_date_to: z.string().optional().describe('Filter by plan date to (YYYY-MM). Example: "2022-12"'),
    created_after: z.string().optional().describe('Filter by created after timestamp. Example: "2022-01-01T00:00:00Z"'),
    updated_after: z.string().optional().describe('Filter by updated after timestamp. Example: "2022-01-01T00:00:00Z"'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Max 100. Example: 50'),
    since_id: z.string().optional().describe('Return results with ID greater than or equal to the specified ID. Example: "16d60890"'),
    max_id: z.string().optional().describe('Return results with ID less than or equal to the specified ID. Example: "16d60890"'),
    cursor: z.string().optional().describe('Pagination cursor (full paging.next URL) from the previous response. Omit for the first page.')
});

const LocationSchema = z.object({
    location_str: z.string().optional(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    region: z.string().optional(),
    region_code: z.string().optional(),
    city: z.string().nullable().optional(),
    zip_code: z.string().nullable().optional()
});

const PersonSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const SalaryRangeSchema = z.object({
    from: z.number().optional(),
    to: z.number().optional(),
    frequency: z.string().optional(),
    currency: z.string().optional(),
    currency_iso: z.string().optional()
});

const SalarySchema = z.object({
    amount: z.number().optional(),
    frequency: z.string().optional(),
    currency_iso: z.string().optional()
});

const RequisitionAttributeValueSchema = z.object({
    body: z.union([z.string(), z.number(), z.boolean()]).optional(),
    choices: z.array(z.string()).optional(),
    data: z
        .object({
            amount: z.number(),
            frequency: z.string(),
            currency_iso: z.string()
        })
        .optional()
});

const RequisitionAttributeSchema = z.object({
    name: z.string(),
    value: RequisitionAttributeValueSchema.optional()
});

const ApproverSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    decision: z.string().optional()
});

const ApprovalGroupSchema = z.object({
    id: z.string(),
    approvers: z.array(ApproverSchema).optional()
});

const JobSchema = z.object({
    id: z.string(),
    title: z.string().optional()
});

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string().optional()
});

const RequisitionSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    job: JobSchema.optional(),
    department: DepartmentSchema.optional(),
    location: LocationSchema.optional(),
    requester: PersonSchema.optional(),
    hiring_manager: PersonSchema.optional(),
    owner: PersonSchema.optional(),
    plan_date: z.string().optional(),
    start_date: z.string().nullable().optional(),
    salary_range: SalaryRangeSchema.optional(),
    salary: SalarySchema.optional(),
    candidate_id: z.string().optional(),
    employment_type: z.string().optional(),
    reason: z.string().optional(),
    state: z.string().optional(),
    requisition_attributes: z.array(RequisitionAttributeSchema).optional(),
    approval_groups: z.array(ApprovalGroupSchema).optional()
});

const ProviderResponseSchema = z.object({
    requisitions: z.array(RequisitionSchema),
    paging: z
        .object({
            next: z.string().nullable().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    requisitions: z.array(RequisitionSchema),
    next_cursor: z.string().optional()
});

function parseCursor(cursor: string): Record<string, string> | null {
    /**
     * @allowTryCatch URL parsing may throw on a malformed cursor string;
     * we catch the error and return null so the caller can raise an ActionError
     * instead of an unhandled runtime exception.
     */
    try {
        const url = new URL(cursor);
        const result: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    } catch {
        return null;
    }
}

const action = createAction({
    description: 'List headcount requisitions (Hiring Plan feature).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_requisitions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let params: Record<string, string> = {};

        if (input.cursor) {
            const parsed = parseCursor(input.cursor);
            if (!parsed) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Invalid pagination cursor provided.'
                });
            }
            params = parsed;
        } else {
            if (input.state) {
                params['state'] = input.state;
            }
            if (input.job_id) {
                params['job_id'] = input.job_id;
            }
            if (input.plan_date_from) {
                params['plan_date_from'] = input.plan_date_from;
            }
            if (input.plan_date_to) {
                params['plan_date_to'] = input.plan_date_to;
            }
            if (input.created_after) {
                params['created_after'] = input.created_after;
            }
            if (input.updated_after) {
                params['updated_after'] = input.updated_after;
            }
            if (input.limit !== undefined) {
                params['limit'] = String(input.limit);
            }
            if (input.since_id) {
                params['since_id'] = input.since_id;
            }
            if (input.max_id) {
                params['max_id'] = input.max_id;
            }
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/requisitions
            endpoint: '/spi/v3/requisitions',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requisitions: providerResponse.requisitions,
            ...(providerResponse.paging?.next != null && { next_cursor: providerResponse.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
