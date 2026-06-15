import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-checklists.js';

describe('trello list-checklists tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-checklists',
        Model: 'ActionOutput_trello_listchecklists'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
