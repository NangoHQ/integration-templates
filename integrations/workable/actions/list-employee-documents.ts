import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    employee_id: z.string().describe('Employee ID. Example: "19ff54"'),
    member_id: z.string().describe('Member ID required for account tokens. Example: "1f395d"'),
    type: z
        .enum(['simple_employee_document', 'signature_request_employee_document', 'timeoff_attachment', 'i_9_form_document'])
        .optional()
        .describe('Document type filter. Defaults to simple_employee_document'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page. Defaults to 10'),
    offset: z.number().int().min(0).optional().describe('Number of results to skip. Defaults to 0')
});

const ProviderDocumentSchema = z.object({
    id: z.string().optional(),
    filename: z.string(),
    filepath: z.string(),
    filesize: z.number(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    employee_documents: z.array(ProviderDocumentSchema)
});

const OutputDocumentSchema = z.object({
    id: z.string().optional(),
    filename: z.string(),
    filepath: z.string(),
    filesize: z.number(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    total_count: z.number(),
    employee_documents: z.array(OutputDocumentSchema),
    limit: z.number().int().optional(),
    offset: z.number().int().optional()
});

const action = createAction({
    description: 'List documents attached to an employee record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            member_id: input.member_id
        };

        if (input.type !== undefined) {
            params['type'] = input.type;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        // https://workable.readme.io/reference/employeesiddocuments
        const response = await nango.get({
            endpoint: `/spi/v3/employees/${encodeURIComponent(input.employee_id)}/documents`,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            total_count: providerResponse.total_count,
            employee_documents: providerResponse.employee_documents.map((doc) => ({
                ...(doc.id !== undefined && { id: doc.id }),
                filename: doc.filename,
                filepath: doc.filepath,
                filesize: doc.filesize,
                ...(doc.created_by !== undefined && { created_by: doc.created_by }),
                ...(doc.created_at !== undefined && { created_at: doc.created_at }),
                ...(doc.updated_at !== undefined && { updated_at: doc.updated_at })
            })),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.offset !== undefined && { offset: input.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
