import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-card-comment.js';

describe('trello add-card-comment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-card-comment',
        Model: 'ActionOutput_trello_addcardcomment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
