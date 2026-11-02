import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        cardId: z.string().min(1).describe('Card receiving the label.'),
        labelId: z.string().min(1).describe('Existing compatible board label ID.')
    })
    .describe('Card and existing board label to associate.');

const OutputSchema = z
    .object({
        added: z.literal(true).describe('Addition acknowledged, not proof the association was previously absent.'),
        cardId: z.string().describe('Target card ID.'),
        labelId: z.string().describe('Associated label ID.')
    })
    .describe('Acknowledgment of the label addition, echoing the target card and label.');

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

/**
 * @tags: [write]
 * @tagReason: Adds a label association to a card through a provider mutation; it reads nothing and deletes nothing.
 * @pitfalls: The label ID must reference an existing board label; this tool does not create labels. Trello does not document what happens when the label is already attached to the card.
 */
const tool = createTool({
    name: 'add-label-to-card',
    description: 'Associate an existing label with a card without replacing its other labels.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Obtain card and existing board-label IDs first. This does not create a label. Use `remove-label-from-card` to undo and `update-card` only for full-set replacement.',
        requiredScopes: ['write:board:trello'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        // @allowTryCatch: translate Trello HTTP error statuses into the tool's public error codes.
        try {
            // https://developer.atlassian.com/cloud/trello/rest/api-group-cards/#api-cards-id-idlabels-post
            await nango.post({
                endpoint: `/1/cards/${encodeURIComponent(input.cardId)}/idLabels`,
                params: {
                    value: input.labelId
                },
                // Not idempotent: Trello documents no idempotency key, so a retry after a lost response could repeat the association.
                retries: 0
            });
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);
            const status = parsedError.success ? parsedError.data.response.status : null;

            if (status === 404) {
                throw new Error('not_found: Card or label not found. Verify the card and label IDs.');
            }
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: Write scope or board edit access is missing. Ask for the write:board:trello scope and edit access.');
            }
            if (status === 400) {
                throw new Error(
                    "provider_rejected: Trello rejected the association. Choose a label compatible with the card's board or resolve board restrictions."
                );
            }
            throw new Error('write_result_unknown: Trello returned no interpretable acknowledgment. Inspect labelIds using `get-card` before retrying.');
        }

        return {
            added: true,
            cardId: input.cardId,
            labelId: input.labelId
        };
    }
});

export default tool;
