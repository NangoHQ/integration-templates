import { z } from 'zod';
import { createAction } from 'nango';

const ProviderCustomStatusSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    group: z.string(),
    standard: z.boolean(),
    standardName: z.boolean(),
    hidden: z.boolean()
});

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    standard: z.boolean().optional(),
    hidden: z.boolean().optional(),
    description: z.string().optional(),
    customStatuses: z.array(ProviderCustomStatusSchema).optional()
});

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(ProviderWorkflowSchema)
});

const WorkflowStatusSchema = z.object({
    id: z.string().describe('Status ID. Referenced by the customStatusId field on tasks and folders. Example: "IEAG5DAKJMAAAAAB"'),
    name: z.string().describe('Display name of the status. Example: "In Progress"'),
    color: z.string().optional().describe('Display color of the status. Example: "Turquoise"'),
    group: z.string().describe('Coarse status group the status belongs to: Active, Deferred, Completed or Cancelled.'),
    standard: z.boolean().describe('Whether this is a built-in Wrike status that cannot be deleted.'),
    standardName: z.boolean().describe("Whether the status name is one of Wrike's default names."),
    hidden: z.boolean().describe('Whether the status is hidden from the Wrike UI.')
});

const WorkflowSchema = z.object({
    id: z.string().describe('Workflow ID. Example: "IEAG5DAKK77ZC47W"'),
    name: z.string().describe('Workflow name. Example: "Default Workflow"'),
    standard: z.boolean().describe("Whether this is Wrike's built-in workflow, which cannot be deleted or renamed."),
    hidden: z.boolean().describe('Whether the workflow is hidden from the Wrike UI.'),
    description: z.string().optional().describe('Human-readable description of the workflow.'),
    customStatuses: z.array(WorkflowStatusSchema).describe('The custom statuses defined on this workflow.')
});

const InputSchema = z.object({}).describe('This action requires no input; it lists every account-wide workflow.');

const OutputSchema = z
    .object({
        workflows: z.array(WorkflowSchema).describe('All account-wide workflows configured on the account, each with its custom statuses.')
    })
    .describe('The account-wide workflows, each with its custom statuses.');

/**
 * @tags: [read]
 * @tagReason: Reads the account's workflows and their custom statuses; it never modifies provider state.
 * @pitfalls: Only account-wide workflows are returned, so any workflows scoped to a specific Space are omitted from the result.
 */
const action = createAction({
    description: "List the account's workflow(s) and each one's custom statuses (read-only).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/reference/getworkflowsempty
            endpoint: '/workflows',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            workflows: parsed.data.map((workflow) => ({
                id: workflow.id,
                name: workflow.name,
                standard: workflow.standard ?? false,
                hidden: workflow.hidden ?? false,
                ...(workflow.description != null && { description: workflow.description }),
                customStatuses: (workflow.customStatuses ?? []).map((status) => ({
                    id: status.id,
                    name: status.name,
                    ...(status.color != null && { color: status.color }),
                    group: status.group,
                    standard: status.standard,
                    standardName: status.standardName,
                    hidden: status.hidden
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
