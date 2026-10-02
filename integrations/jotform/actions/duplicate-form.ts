import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the existing Jotform form to duplicate. Example: "262715780901055"'),
        title: z.string().min(1).describe('Title to set on the newly created duplicate form. Example: "Duplicated Intake Form v2"')
    })
    .describe('Input for duplicating a Jotform form: the source form to clone and the title for the new copy');

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the newly created duplicate form. Example: "262735584490062"'),
        title: z.string().describe('Title of the duplicate form after the rename step'),
        url: z.string().describe('URL of the duplicate form. Example: "https://form.jotform.com/262735584490062"')
    })
    .describe('Result of duplicating a Jotform form: identifying details of the renamed clone');

const JotformResponseEnvelopeSchema = z.object({
    responseCode: z.number(),
    message: z.string().optional(),
    content: z.unknown()
});

const ClonedFormSchema = z.object({
    id: z.string(),
    title: z.string(),
    // Optional to match the sibling clone-form action: a response without it must not fail parsing
    // before the rename step runs, since the id alone is enough to derive the form's public URL.
    url: z.string().optional()
});

/**
 * @tags: [write]
 * @tagReason: Clones an existing form and renames the clone, both provider-side mutations; no provider reads are made.
 * @pitfalls: The clone-and-rename is not atomic: if the rename step fails after the clone succeeds, the duplicate is left behind with Jotform's auto-generated "Clone of ..." title, and the thrown error includes the new form's ID so it can be renamed again or deleted. Cloning copies the form's structure only; existing submissions are not carried over to the duplicate.
 */
const action = createAction({
    description: 'Clone an existing Jotform form and set the title of the new copy in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/#post-form-id-clone
        const cloneResponse = await nango.post({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/clone`,
            // Non-idempotent create: a retry after a lost response would create a second duplicate form.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const cloneEnvelope = JotformResponseEnvelopeSchema.parse(cloneResponse.data);
        if (cloneEnvelope.responseCode !== 200) {
            throw new nango.ActionError({
                type: 'clone_failed',
                message: cloneEnvelope.message ?? 'Jotform failed to clone the form.',
                form_id: input.form_id
            });
        }
        const clonedForm = ClonedFormSchema.parse(cloneEnvelope.content);

        // This properties sub-endpoint honors body params (documented as properties[title]); other Jotform write endpoints silently ignore body params and require query strings.
        // https://api.jotform.com/docs/#put-form-id-properties
        const updateResponse = await nango.put({
            endpoint: `/form/${encodeURIComponent(clonedForm.id)}/properties`,
            data: {
                properties: {
                    title: input.title
                }
            },
            // Idempotent: re-applying the same title is harmless if a response is lost.
            retries: 3
        });

        const updateEnvelope = JotformResponseEnvelopeSchema.parse(updateResponse.data);
        if (updateEnvelope.responseCode !== 200) {
            throw new nango.ActionError({
                type: 'rename_failed',
                message: updateEnvelope.message ?? 'The form was cloned but Jotform failed to set its title.',
                new_form_id: clonedForm.id
            });
        }

        return {
            id: clonedForm.id,
            title: input.title,
            url: clonedForm.url ?? `https://form.jotform.com/${clonedForm.id}`
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
