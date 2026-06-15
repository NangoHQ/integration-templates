import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-checklist.js';

describe('trello update-checklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-checklist',
        Model: 'ActionOutput_trello_updatechecklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
