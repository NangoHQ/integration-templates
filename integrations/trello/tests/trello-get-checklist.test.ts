import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-checklist.js';

describe('trello get-checklist tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-checklist',
        Model: 'ActionOutput_trello_getchecklist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
