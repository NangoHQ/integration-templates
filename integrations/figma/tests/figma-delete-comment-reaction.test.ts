import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-comment-reaction.js';

describe('figma delete-comment-reaction tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-comment-reaction',
        Model: 'ActionOutput_figma_deletecommentreaction'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
