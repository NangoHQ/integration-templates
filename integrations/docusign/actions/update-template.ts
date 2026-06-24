import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    templateId: z.string().describe('Template ID. Example: "e13866df-36e6-462b-b35b-dcda35982abc"'),
    name: z.string().optional().describe('New template name'),
    description: z.string().nullable().optional().describe('New template description. Pass null to clear.'),
    emailSubject: z.string().optional().describe('Email subject for envelopes created from this template'),
    emailBlurb: z.string().optional().describe('Email body for envelopes created from this template')
});

const MetadataSchema = z.object({
    accountId: z.string().optional()
});

const ErrorDetailsSchema = z.object({
    errorCode: z.string().optional(),
    message: z.string().optional()
});

const RecipientUpdateResultSchema = z.object({
    recipientId: z.string().optional(),
    recipientIdGuid: z.string().optional(),
    errorDetails: ErrorDetailsSchema.optional()
});

const TemplateUpdateSummarySchema = z.object({
    envelopeId: z.string().optional(),
    recipientUpdateResults: z.array(RecipientUpdateResultSchema).optional(),
    errorDetails: ErrorDetailsSchema.optional()
});

const OutputSchema = z.object({
    templateId: z.string(),
    name: z.string().optional(),
    description: z.string().optional()
});

const action = createAction({
    description: "Update a template's name, description, documents, or recipients.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const accountId = metadata.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }

        const requestBody: Record<string, unknown> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.emailSubject !== undefined && { emailSubject: input.emailSubject }),
            ...(input.emailBlurb !== undefined && { emailBlurb: input.emailBlurb })
        };

        // https://developers.docusign.com/docs/esign-rest-api/reference/templates/templates/update/
        const response = await nango.put({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/templates/${encodeURIComponent(input.templateId)}`,
            data: requestBody,
            retries: 3
        });

        const updateSummary = TemplateUpdateSummarySchema.parse(response.data);

        if (updateSummary.errorDetails?.errorCode) {
            throw new nango.ActionError({
                type: 'api_error',
                message: updateSummary.errorDetails.message || 'Template update failed',
                code: updateSummary.errorDetails.errorCode
            });
        }

        return {
            templateId: input.templateId,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && input.description !== null && { description: input.description })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
