import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-label.js';

describe('trello get-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-label',
        Model: 'ActionOutput_trello_getlabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
