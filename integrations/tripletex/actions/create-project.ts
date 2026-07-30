import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Project name. Example: "New Website"'),
    projectManagerId: z.number().describe('Employee ID of the project manager. Example: 11966637'),
    startDate: z.string().describe('Project start date (ISO 8601). Example: "2026-07-28"'),
    isInternal: z.boolean().optional().describe('Whether the project is internal. Defaults to false.'),
    description: z.string().optional().describe('Project description.'),
    endDate: z.string().optional().describe('Project end date (ISO 8601).'),
    customerId: z.number().optional().describe('Customer ID linked to the project.'),
    departmentId: z.number().optional().describe('Department ID linked to the project.')
});

const ProjectManagerSchema = z.object({
    id: z.number()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    number: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    projectManager: ProjectManagerSchema.nullable().optional(),
    isInternal: z.boolean().nullable().optional(),
    isClosed: z.boolean().nullable().optional(),
    isReadyForInvoicing: z.boolean().nullable().optional(),
    isOffer: z.boolean().nullable().optional(),
    isFixedPrice: z.boolean().nullable().optional(),
    url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderProjectSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    number: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectManagerId: z.number().optional(),
    isInternal: z.boolean().optional(),
    isClosed: z.boolean().optional(),
    isReadyForInvoicing: z.boolean().optional(),
    isOffer: z.boolean().optional(),
    isFixedPrice: z.boolean().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Create a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/project',
            data: {
                name: input.name,
                projectManager: { id: input.projectManagerId },
                startDate: input.startDate,
                isInternal: input.isInternal ?? false,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.endDate !== undefined && { endDate: input.endDate }),
                ...(input.customerId !== undefined && { customer: { id: input.customerId } }),
                ...(input.departmentId !== undefined && { department: { id: input.departmentId } })
            },
            retries: 10
        });

        const wrapper = ProviderResponseSchema.parse(response.data);
        const project = wrapper.value;

        return {
            id: project.id,
            name: project.name,
            ...(project.number != null && { number: project.number }),
            ...(project.displayName != null && { displayName: project.displayName }),
            ...(project.description != null && { description: project.description }),
            ...(project.startDate != null && { startDate: project.startDate }),
            ...(project.endDate != null && { endDate: project.endDate }),
            ...(project.projectManager != null && { projectManagerId: project.projectManager.id }),
            ...(project.isInternal != null && { isInternal: project.isInternal }),
            ...(project.isClosed != null && { isClosed: project.isClosed }),
            ...(project.isReadyForInvoicing != null && { isReadyForInvoicing: project.isReadyForInvoicing }),
            ...(project.isOffer != null && { isOffer: project.isOffer }),
            ...(project.isFixedPrice != null && { isFixedPrice: project.isFixedPrice }),
            ...(project.url != null && { url: project.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
