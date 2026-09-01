import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-todoset.js';

describe('basecamp get-todoset tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-todoset',
        Model: 'ActionOutput_basecamp_gettodoset'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
