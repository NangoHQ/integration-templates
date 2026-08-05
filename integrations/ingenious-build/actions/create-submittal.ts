import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    status: z
        .enum(['draft', 'pending-submission', 'design-review', 'manager-review', 'responded', 'revision-request', 'closed', 'archived', 'rejected'])
        .describe('Status of the submittal. Example: "draft"'),
    project_id: z.string().describe('The project ID to which the submittal belongs. Example: "6a71de59f55241acad0cd44e"'),
    package_id: z.string().describe('The package ID to which the submittal belongs. Example: "6a71dfa2f55241acad0cd56a"'),
    type_id: z.string().describe('The submittal type ID defined in Project Settings. Example: "6a71df8992e09607f906dc20"'),
    title: z.string().describe('The title of the submittal. Example: "Nango Registry Test Submittal"'),
    description: z.string().optional().describe('Additional information further describing the submittal.'),
    final_approval_due_date: z.string().optional().describe('Date in Y-m-d format used to calculate schedule dates.'),
    required_on_site_date: z.string().optional().describe('Date materials are required on-site. Y-m-d format.'),
    material_lead_time: z.number().optional().describe('Amount of days/weeks for materials to arrive.'),
    material_lead_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for material lead time.'),
    internal_review_time: z.number().optional().describe('Amount of days/weeks reviewers have to review.'),
    internal_review_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for internal review.'),
    design_review_time: z.number().optional().describe('Amount of days/weeks official reviewers have to review.'),
    design_review_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for design review.'),
    contractor_review_time: z.number().optional().describe('Amount of days/weeks documentation must be submitted by.'),
    contractor_review_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for contractor review.'),
    submittal_manager_review_time: z.number().optional().describe('Amount of days/weeks reviewers have to review.'),
    submittal_manager_review_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for submittal manager review.'),
    submittal_approval_review_time: z.number().optional().describe('Amount of days/weeks the Submittal Manager has to review.'),
    submittal_approval_review_time_unit: z.enum(['days', 'weeks']).optional().describe('Unit of time for submittal approval review.'),
    responsible_contractor_id: z.string().optional().describe('The ID of the contractor responsible for this submittal.'),
    ball_in_court_id: z.string().optional().describe('Ball in Court person ID.'),
    submittal_manager_id: z.string().optional().describe('Person ID of submittal manager.'),
    official_reviewer_id: z.string().optional().describe('Official reviewer person ID.'),
    impacted_party_ids: z.array(z.string()).optional().describe('Array of person IDs that are impacted.'),
    document_ids: z.array(z.string()).optional().describe('Uploaded document IDs associated with the submittal.'),
    external_id: z.string().optional().describe('The external ID of the submittal.'),
    source_platform: z.string().optional().describe('The source platform from which the submittal is being created.'),
    external_reference_url: z.string().optional().describe('The URL to the submittal in the source platform.')
});

const CreateSubmittalResponseSchema = z.object({
    id: z.string()
});

const SubmittalSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    package_id: z.string().nullable(),
    status: z.string(),
    type_id: z.string().nullable(),
    title: z.string(),
    number: z.string(),
    description: z.string().nullable(),
    due_date: z.string().nullable(),
    ball_in_court_id: z.string().nullable(),
    submittal_manager_id: z.string().nullable(),
    official_reviewer_id: z.string().nullable(),
    additional_reviewer_ids: z.array(z.string()),
    impacted_party_ids: z.array(z.string()),
    responsible_contractor_id: z.string().nullable(),
    document_ids: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Create a new submittal within a package.',
    version: '1.0.0',
    input: InputSchema,
    output: SubmittalSchema,

    exec: async (nango, input): Promise<z.infer<typeof SubmittalSchema>> => {
        // https://api.ingenious.build/reference/v2-create-submittal.md
        const createResponse = await nango.post({
            endpoint: '/api/v2/pub/submittals',
            data: {
                status: input.status,
                project_id: input.project_id,
                package_id: input.package_id,
                type_id: input.type_id,
                title: input.title,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.final_approval_due_date !== undefined && { final_approval_due_date: input.final_approval_due_date }),
                ...(input.required_on_site_date !== undefined && { required_on_site_date: input.required_on_site_date }),
                ...(input.material_lead_time !== undefined && { material_lead_time: input.material_lead_time }),
                ...(input.material_lead_time_unit !== undefined && { material_lead_time_unit: input.material_lead_time_unit }),
                ...(input.internal_review_time !== undefined && { internal_review_time: input.internal_review_time }),
                ...(input.internal_review_time_unit !== undefined && { internal_review_time_unit: input.internal_review_time_unit }),
                ...(input.design_review_time !== undefined && { design_review_time: input.design_review_time }),
                ...(input.design_review_time_unit !== undefined && { design_review_time_unit: input.design_review_time_unit }),
                ...(input.contractor_review_time !== undefined && { contractor_review_time: input.contractor_review_time }),
                ...(input.contractor_review_time_unit !== undefined && { contractor_review_time_unit: input.contractor_review_time_unit }),
                ...(input.submittal_manager_review_time !== undefined && { submittal_manager_review_time: input.submittal_manager_review_time }),
                ...(input.submittal_manager_review_time_unit !== undefined && { submittal_manager_review_time_unit: input.submittal_manager_review_time_unit }),
                ...(input.submittal_approval_review_time !== undefined && { submittal_approval_review_time: input.submittal_approval_review_time }),
                ...(input.submittal_approval_review_time_unit !== undefined && {
                    submittal_approval_review_time_unit: input.submittal_approval_review_time_unit
                }),
                ...(input.responsible_contractor_id !== undefined && { responsible_contractor_id: input.responsible_contractor_id }),
                ...(input.ball_in_court_id !== undefined && { ball_in_court_id: input.ball_in_court_id }),
                ...(input.submittal_manager_id !== undefined && { submittal_manager_id: input.submittal_manager_id }),
                ...(input.official_reviewer_id !== undefined && { official_reviewer_id: input.official_reviewer_id }),
                ...(input.impacted_party_ids !== undefined && { impacted_party_ids: input.impacted_party_ids }),
                ...(input.document_ids !== undefined && { document_ids: input.document_ids }),
                ...(input.external_id !== undefined && { external_id: input.external_id }),
                ...(input.source_platform !== undefined && { source_platform: input.source_platform }),
                ...(input.external_reference_url !== undefined && { external_reference_url: input.external_reference_url })
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate submittal on a transient failure.
            retries: 1
        });

        if (!createResponse.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create submittal: empty response from provider.'
            });
        }

        const createResult = CreateSubmittalResponseSchema.safeParse(createResponse.data);
        let submittalId: string;

        if (createResult.success) {
            submittalId = createResult.data.id;
        } else {
            const fullSubmittal = SubmittalSchema.safeParse(createResponse.data);
            if (fullSubmittal.success) {
                return fullSubmittal.data;
            }

            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create submittal: unexpected response from provider.',
                provider_response: createResponse.data
            });
        }

        // https://api.ingenious.build/reference/v2-get-submittal.md
        const getResponse = await nango.get({
            endpoint: `/api/v2/pub/submittals/${encodeURIComponent(submittalId)}`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Submittal created but could not be retrieved. ID: ${submittalId}`
            });
        }

        const submittal = SubmittalSchema.parse(getResponse.data);
        return submittal;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
