import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('The envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"')
});

const FormDataFieldSchema = z.object({
    name: z.string().optional(),
    value: z.string().optional(),
    tabLabel: z.string().optional(),
    tabName: z.string().optional(),
    originalValue: z.string().optional(),
    recipientId: z.string().optional()
});

const RecipientFormDataSchema = z.object({
    recipientId: z.string().optional(),
    formData: z.array(FormDataFieldSchema).optional()
});

const OutputSchema = z.object({
    formData: z.array(FormDataFieldSchema).optional(),
    prefillFormData: z.array(FormDataFieldSchema).optional(),
    recipientFormData: z.array(RecipientFormDataSchema).optional()
});

const action = createAction({
    description: 'Retrieve form field (tab) data filled in by recipients.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ accountId?: string }>();
        const accountId = metadata?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopes/getenvelopeformdata/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/form_data`,
            retries: 3
        });

        const raw = response.data;

        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from DocuSign API.'
            });
        }

        const formData = Array.isArray(raw.formData) ? raw.formData.map((field: unknown) => FormDataFieldSchema.parse(field)) : undefined;
        const prefillFormData = Array.isArray(raw.prefillFormData) ? raw.prefillFormData.map((field: unknown) => FormDataFieldSchema.parse(field)) : undefined;
        const recipientFormData = Array.isArray(raw.recipientFormData)
            ? raw.recipientFormData.map((r: unknown) => RecipientFormDataSchema.parse(r))
            : undefined;

        return {
            ...(formData !== undefined && { formData }),
            ...(prefillFormData !== undefined && { prefillFormData }),
            ...(recipientFormData !== undefined && { recipientFormData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
