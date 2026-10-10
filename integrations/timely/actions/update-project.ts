import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().describe('Timely account ID that owns the project. Discover it with the list-accounts action. Example: 1145787.'),
        project_id: z.number().describe('ID of the project to update. Example: 5691492.'),
        name: z
            .string()
            .refine((value) => value.trim().length > 0, { message: 'name must not be blank.' })
            .optional()
            .describe('New project name. Must not be blank.'),
        description: z.string().optional().describe('New project description. Pass an empty string to clear it.'),
        color: z.string().nullable().optional().describe('New hex color without the leading "#", e.g. "ff0000". Pass null to clear the color.'),
        rate_type: z
            .enum(['non-billable', 'project', 'user'])
            .optional()
            .describe('Billing mode: "non-billable", "project" (uses the project hourly rate), or "user" (uses each user\'s rate).'),
        enable_labels: z
            .enum(['none', 'all'])
            .optional()
            .describe(
                'Whether time entries on this project can carry labels: "none" or "all". Must be "all" before an event on this project can be saved with label_ids.'
            ),
        active: z.boolean().optional().describe('Whether the project is active. Set false to archive it.'),
        billable: z.boolean().optional().describe('Whether the project is billable.'),
        hour_rate: z.number().optional().describe('Hourly rate applied when rate_type is "project".'),
        budget: z.number().optional().describe('Project budget amount or hours, interpreted by the project budget settings.'),
        company_id: z.number().optional().describe('ID of the client (company) the project belongs to. Example: 2193170.'),
        external_id: z.string().optional().describe('External identifier to associate with the project.'),
        required_notes: z.boolean().optional().describe('Whether time entries logged on this project must include a note.')
    })
    .describe('The account and project identifiers plus the project fields to partially update.');

const ProviderProjectSchema = z.object({
    id: z.number(),
    account_id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string().nullable(),
    rate_type: z.string(),
    billable: z.boolean(),
    enable_labels: z.string(),
    active: z.boolean(),
    hour_rate: z.number(),
    budget: z.number(),
    external_id: z.string().nullable(),
    required_notes: z.boolean(),
    client: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .nullable(),
    created_at: z.number(),
    updated_at: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the updated project.'),
        account_id: z.number().describe('ID of the Timely account that owns the project.'),
        name: z.string().describe('Current project name.'),
        description: z.string().nullable().describe('Project description, or null when none is set.'),
        color: z.string().nullable().describe('Project hex color without the leading "#", or null when unset.'),
        rate_type: z.string().describe('Current billing mode of the project.'),
        billable: z.boolean().describe('Whether the project is billable.'),
        enable_labels: z.string().describe('Whether labels are enabled for time entries on this project.'),
        active: z.boolean().describe('Whether the project is active.'),
        hour_rate: z.number().describe('Hourly rate applied when rate_type is "project".'),
        budget: z.number().describe('Configured project budget.'),
        external_id: z.string().nullable().describe('External identifier associated with the project, or null when unset.'),
        required_notes: z.boolean().describe('Whether time entries on this project must include a note.'),
        client: z
            .object({
                id: z.number().describe('Client (company) ID.'),
                name: z.string().describe('Client (company) name.')
            })
            .nullable()
            .describe('Client the project belongs to, or null when unset.'),
        created_at: z.number().describe('Unix timestamp in seconds when the project was created.'),
        updated_at: z.number().describe('Unix timestamp in seconds when the project was last updated.')
    })
    .describe('The project as returned by the provider after the partial update was applied.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing provider project via a PUT; it creates no provider records and deletes nothing.
 * @pitfalls: enable_labels accepts only "none"/"all" and rate_type only "non-billable"/"project"/"user" (other values are rejected); null is ignored for most fields rather than clearing them, so send an empty string to clear description (only color clears on null), and an empty name is rejected.
 */
const action = createAction({
    description: "Update a project's fields (partial merge) - e.g. rename it, change its rate_type, or flip enable_labels to allow labeled time entries.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const project = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.color !== undefined && { color: input.color }),
            ...(input.rate_type !== undefined && { rate_type: input.rate_type }),
            ...(input.enable_labels !== undefined && { enable_labels: input.enable_labels }),
            ...(input.active !== undefined && { active: input.active }),
            ...(input.billable !== undefined && { billable: input.billable }),
            ...(input.hour_rate !== undefined && { hour_rate: input.hour_rate }),
            ...(input.budget !== undefined && { budget: input.budget }),
            ...(input.company_id !== undefined && { company_id: input.company_id }),
            ...(input.external_id !== undefined && { external_id: input.external_id }),
            ...(input.required_notes !== undefined && { required_notes: input.required_notes })
        };

        if (Object.keys(project).length === 0) {
            throw new nango.ActionError({
                type: 'no_fields',
                message: 'Provide at least one project field to update.'
            });
        }

        const response = await nango.put({
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/projects/${encodeURIComponent(String(input.project_id))}`,
            data: {
                project
            },
            retries: 3
        });

        const updatedProject = ProviderProjectSchema.parse(response.data);

        return {
            id: updatedProject.id,
            account_id: updatedProject.account_id,
            name: updatedProject.name,
            description: updatedProject.description,
            color: updatedProject.color,
            rate_type: updatedProject.rate_type,
            billable: updatedProject.billable,
            enable_labels: updatedProject.enable_labels,
            active: updatedProject.active,
            hour_rate: updatedProject.hour_rate,
            budget: updatedProject.budget,
            external_id: updatedProject.external_id,
            required_notes: updatedProject.required_notes,
            client: updatedProject.client,
            created_at: updatedProject.created_at,
            updated_at: updatedProject.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
