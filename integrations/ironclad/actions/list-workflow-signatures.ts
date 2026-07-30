import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workflowId: z.string().describe('Workflow ID. Example: "6a6b328004308879e7d439b6"')
});

const ProviderSignatureStatusSchema = z.object({
    status: z.string()
});

const ProviderSignerSchema = z.object({
    roleName: z.string(),
    name: z.string(),
    email: z.string(),
    signatureStatus: ProviderSignatureStatusSchema,
    routingOrder: z.number()
});

const ProviderResponseSchema = z.object({
    workflowId: z.string(),
    title: z.string(),
    signers: z.array(ProviderSignerSchema),
    routing: z.string()
});

const SignatureStatusSchema = z.object({
    status: z.string()
});

const SignerSchema = z.object({
    roleName: z.string(),
    name: z.string(),
    email: z.string(),
    signatureStatus: SignatureStatusSchema,
    routingOrder: z.number()
});

const OutputSchema = z.object({
    workflowId: z.string(),
    title: z.string(),
    signers: z.array(SignerSchema),
    routing: z.string()
});

const action = createAction({
    description: "List the signers and their per-signer signature status on a workflow's signature packet.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/
            endpoint: `/public/api/v1/workflows/${encodeURIComponent(input.workflowId)}/signatures`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            workflowId: parsed.workflowId,
            title: parsed.title,
            routing: parsed.routing,
            signers: parsed.signers.map((signer) => ({
                roleName: signer.roleName,
                name: signer.name,
                email: signer.email,
                signatureStatus: {
                    status: signer.signatureStatus.status
                },
                routingOrder: signer.routingOrder
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
