import { createSync } from 'nango';
import { z } from 'zod';

const BoardSchema = z.object({
    id: z.string()
});

const CustomFieldOptionSchema = z.object({
    id: z.string(),
    value: z
        .object({
            text: z.string().optional()
        })
        .passthrough()
        .optional(),
    color: z.string().optional(),
    pos: z.number().optional()
});

const CustomFieldResponseSchema = z.object({
    id: z.string(),
    idModel: z.string(),
    modelType: z.string().optional(),
    fieldGroup: z.string().optional(),
    name: z.string(),
    pos: z.number().optional(),
    type: z.string(),
    options: z.array(CustomFieldOptionSchema).optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    boardId: z.string(),
    name: z.string(),
    type: z.string(),
    pos: z.number().optional(),
    options: z
        .array(
            z.object({
                id: z.string(),
                value: z.string().optional(),
                color: z.string().optional(),
                pos: z.number().optional()
            })
        )
        .optional()
});

const CheckpointSchema = z.object({
    board_id: z.string()
});

const sync = createSync({
    description: 'Sync custom field definitions from Trello boards',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/custom-fields'
        }
    ],
    models: {
        CustomField: CustomFieldSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            await nango.trackDeletesStart('CustomField');
        }

        // https://developer.atlassian.com/cloud/trello/rest/api-group-members/#api-members-id-boards-get
        const boardsResponse = await nango.get({
            endpoint: '/1/members/me/boards',
            retries: 3
        });

        const boardsResult = z.array(BoardSchema).safeParse(boardsResponse.data);
        if (!boardsResult.success) {
            throw new Error('Failed to parse boards response: ' + boardsResult.error.message);
        }

        const boards = boardsResult.data.sort((a, b) => a.id.localeCompare(b.id));
        const startBoardIndex = checkpoint
            ? Math.max(
                  boards.findIndex((board) => board.id === checkpoint.board_id),
                  0
              )
            : 0;

        for (let boardIndex = startBoardIndex; boardIndex < boards.length; boardIndex++) {
            const board = boards[boardIndex]!;

            // https://developer.atlassian.com/cloud/trello/rest/api-group-boards/#api-boards-id-customfields-get
            const fieldsResponse = await nango.get({
                endpoint: `/1/boards/${encodeURIComponent(board.id)}/customFields`,
                retries: 3
            });

            const fieldsResult = z.array(CustomFieldResponseSchema).safeParse(fieldsResponse.data);
            if (!fieldsResult.success) {
                throw new Error('Failed to parse custom fields response: ' + fieldsResult.error.message);
            }

            const customFields = fieldsResult.data.map((field) => ({
                id: field.id,
                boardId: field.idModel,
                name: field.name,
                type: field.type,
                ...(field.pos !== undefined && { pos: field.pos }),
                ...(field.options !== undefined && {
                    options: field.options.map((opt) => ({
                        id: opt.id,
                        ...(opt.value?.text !== undefined && { value: opt.value.text }),
                        ...(opt.color !== undefined && { color: opt.color }),
                        ...(opt.pos !== undefined && { pos: opt.pos })
                    }))
                })
            }));

            if (customFields.length > 0) {
                await nango.batchSave(customFields, 'CustomField');
            }

            const nextBoard = boards[boardIndex + 1];
            if (nextBoard) {
                await nango.saveCheckpoint({ board_id: nextBoard.id });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
