import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('The unique identifier or Ironclad ID of a workflow. Example: "6a6b328004308879e7d439b6"')
});

const DelegateSchema = z.object({
    name: z.string().optional(),
    email: z.string().optional()
});

const BaseSignerSchema = z.object({
    name: z.string(),
    email: z.string(),
    roleName: z.string(),
    status: z.enum(['pending', 'declined', 'sent', 'viewed', 'signed']),
    isWetSigned: z.boolean().optional(),
    delegates: z.array(DelegateSchema).optional(),
    routingOrder: z.number().optional()
});

const InternalSignerSchema = BaseSignerSchema.extend({
    type: z.literal('internal'),
    userId: z.string().optional()
});

const ExternalSignerSchema = BaseSignerSchema.extend({
    type: z.literal('external')
});

const SignerSchema = z.discriminatedUnion('type', [InternalSignerSchema, ExternalSignerSchema]);

const ScheduledSendSchema = z.object({
    notifyAt: z.string().optional(),
    reminder: z
        .object({
            daysBefore: z.number().optional(),
            reminderDate: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    signers: z.array(SignerSchema).optional(),
    routing: z.enum(['sequential', 'parallel']).optional(),
    status: z.enum(['not_sent', 'sent', 'action_required', 'complete']).optional(),
    requireSignedDocumentUpload: z.boolean().optional(),
    provider: z
        .enum(['Ironclad Clickwrap', 'Ironclad Signature', 'Ironclad Signature (Legacy)', 'DocuSign', 'Adobe Sign', 'DropboxSign', 'Demo', 'None'])
        .optional(),
    scheduledSend: ScheduledSendSchema.optional()
});

const action = createAction({
    description: 'Get the signature status of a workflow that has reached its Sign step.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readSignStatus'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/get-sign-status
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/sign-status`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
