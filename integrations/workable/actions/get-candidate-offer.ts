import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID. Example: "27273038"')
});

const ProviderCandidateSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderOfferSchema = z
    .object({
        candidate: ProviderCandidateSchema,
        state: z.string().optional(),
        documents: z.array(z.unknown()).optional(),
        document_variables: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        candidate_id: z.string(),
        candidate_name: z.string(),
        state: z.string().optional(),
        documents: z.array(z.unknown()).optional(),
        document_variables: z.array(z.unknown()).optional()
    })
    .nullable();

const action = createAction({
    description: "Retrieve a candidate's latest offer, if any.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/get-candidate-offer
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/offer`,
            retries: 3
        };

        const response = await nango.get(config);

        const data = ProviderOfferSchema.parse(response.data);

        const hasOffer = data.state !== undefined || (data.documents !== undefined && data.documents.length > 0);

        if (!hasOffer) {
            return null;
        }

        return {
            candidate_id: data.candidate.id,
            candidate_name: data.candidate.name,
            ...(data.state !== undefined && { state: data.state }),
            ...(data.documents !== undefined && { documents: data.documents }),
            ...(data.document_variables !== undefined && { document_variables: data.document_variables })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
