import { createAction } from "nango";
import type { NoteObject} from "../models.js";
import { AshbyCreateNoteResponse, AshbyCreateNoteInput } from "../models.js";

const action = createAction({
    description: "Action to create a note on a candidate.",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/notes",
        group: "Notes"
    },

    input: AshbyCreateNoteInput,
    output: AshbyCreateNoteResponse,

    exec: async (nango, input): Promise<AshbyCreateNoteResponse> => {
        //input validation
        if (!input.candidateId) {
            throw new nango.ActionError({
                message: 'candidateId is a required field'
            });
        } else if (typeof input.note === 'object') {
            const noteObject: NoteObject = input.note;
            if (!noteObject.value || !noteObject.type) {
                throw new nango.ActionError({
                    message: 'When note is an object, it must have "value" and "type" properties, both of which are required'
                });
            }
        } else if (!input.note) {
            throw new nango.ActionError({
                message: 'note is a required field'
            });
        }

        const postData = {
            candidateId: input.candidateId,
            sendNotifications: input.sendNotifications,
            note: input.note
        };

        const resp = await nango.post({
            endpoint: `/candidate.createNote`,
            data: postData,
            retries: 3
        });

        const { id, createdAt, content, author } = resp.data.results;

        return { id, createdAt, content, author };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
