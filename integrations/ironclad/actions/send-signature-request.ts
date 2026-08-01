import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of the workflow. Example: "6a6b328004308879e7d439b6"')
});

const SignerDelegateSchema = z.object({
    name: z.string(),
    email: z.string()
});

const BaseSignStatusSignerSchema = z.object({
    name: z.string(),
    email: z.string(),
    roleName: z.string(),
    status: z.enum(['pending', 'declined', 'sent', 'viewed', 'signed']),
    isWetSigned: z.boolean().optional(),
    delegates: z.array(SignerDelegateSchema).optional(),
    routingOrder: z.number().optional()
});

const SignStatusInternalSignerSchema = BaseSignStatusSignerSchema.extend({
    type: z.literal('internal'),
    userId: z.string().optional()
});

const SignStatusExternalSignerSchema = BaseSignStatusSignerSchema.extend({
    type: z.literal('external')
});

const SignStatusSignerSchema = z.union([SignStatusInternalSignerSchema, SignStatusExternalSignerSchema]);

const ScheduledSendSchema = z.object({
    notifyAt: z.string(),
    reminder: z
        .object({
            daysBefore: z.number(),
            reminderDate: z.string()
        })
        .optional()
});

const ProviderSignStatusSchema = z.object({
    signers: z.array(SignStatusSignerSchema).optional(),
    routing: z.enum(['sequential', 'parallel']).optional(),
    status: z.enum(['not_sent', 'sent', 'action_required', 'complete']).optional(),
    requireSignedDocumentUpload: z.boolean().optional(),
    provider: z.string().optional(),
    scheduledSend: ScheduledSendSchema.optional()
});

const OutputSchema = ProviderSignStatusSchema;

const action = createAction({
    description: 'Send the signature packet to signers for a workflow at its Sign step.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.sendSignatureRequests'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ironcladapp.com/reference/send-signature-request
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/sign-status/send-signature-request`,
            retries: 3
        });

        const providerData = ProviderSignStatusSchema.parse(response.data);
        return providerData;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
