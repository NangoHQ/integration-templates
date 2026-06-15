import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-card-actions.js';

describe('trello list-card-actions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-card-actions',
        Model: 'ActionOutput_trello_listcardactions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
