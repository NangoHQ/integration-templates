import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Document title. Example: "Proposal"'),
    url: z.string().url().describe('Public URL of the file to attach. Example: "https://example.com/file.pdf"'),
    deal_id: z.number().optional().describe('Deal ID to associate the document with. Example: 55383278'),
    person_id: z.number().optional().describe('Person ID to associate the document with. Example: 1309859835'),
    company_id: z.number().optional().describe('Company ID to associate the document with. Example: 138551860')
});

const ProviderDocumentSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    url: z.string().optional(),
    deal_id: z.number().nullable().optional(),
    person_id: z.number().nullable().optional(),
    company_id: z.number().nullable().optional(),
    upload_state: z.string().optional(),
    size_in_k: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    title: z.string().optional(),
    url: z.string().optional(),
    deal_id: z.number().optional(),
    person_id: z.number().optional(),
    company_id: z.number().optional(),
    upload_state: z.string().optional(),
    size_in_k: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Attach a file to a deal, person, or company by URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.deal_id && !input.person_id && !input.company_id) {
            throw new nango.ActionError({
                type: 'missing_association',
                message: 'A document must be associated with a person, deal, or company. Provide one of deal_id, person_id, or company_id.'
            });
        }

        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/documents',
            data: {
                document: {
                    title: input.title,
                    url: input.url,
                    ...(input.deal_id !== undefined && { deal_id: input.deal_id }),
                    ...(input.person_id !== undefined && { person_id: input.person_id }),
                    ...(input.company_id !== undefined && { company_id: input.company_id })
                }
            },
            retries: 3
        });

        const responseWrapper = z
            .object({
                document: ProviderDocumentSchema
            })
            .safeParse(response.data);
        const providerDocument = responseWrapper.success ? responseWrapper.data.document : ProviderDocumentSchema.parse(response.data);

        return {
            id: providerDocument.id,
            ...(providerDocument.title !== undefined && { title: providerDocument.title }),
            ...(providerDocument.url !== undefined && { url: providerDocument.url }),
            ...(providerDocument.deal_id != null && { deal_id: providerDocument.deal_id }),
            ...(providerDocument.person_id != null && { person_id: providerDocument.person_id }),
            ...(providerDocument.company_id != null && { company_id: providerDocument.company_id }),
            ...(providerDocument.upload_state !== undefined && { upload_state: providerDocument.upload_state }),
            ...(providerDocument.size_in_k !== undefined && { size_in_k: providerDocument.size_in_k }),
            ...(providerDocument.created_at !== undefined && { created_at: providerDocument.created_at }),
            ...(providerDocument.updated_at !== undefined && { updated_at: providerDocument.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
