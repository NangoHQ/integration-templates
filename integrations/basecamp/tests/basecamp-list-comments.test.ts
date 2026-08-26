import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-comments.js';

describe('basecamp list-comments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-comments',
        Model: 'ActionOutput_basecamp_listcomments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should follow an absolute next-page cursor without doubling the account ID in the URL', async () => {
        const cursorMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'list-comments-cursor',
            Model: 'ActionOutput_basecamp_listcomments'
        });

        const input = await cursorMock.getInput();
        const response = await createAction.exec(cursorMock, input);
        const output = await cursorMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject a malformed cursor with a structured ActionError instead of throwing a raw TypeError', async () => {
        nangoMock.ActionError = class ActionError extends Error {
            constructor(public payload: Record<string, unknown>) {
                super(payload.message as string);
            }
        };

        const input = await nangoMock.getInput();

        await expect(
            createAction.exec(nangoMock, {
                ...input,
                cursor: 'not a valid url'
            })
        ).rejects.toThrow(/not a valid URL/);
    });
});
