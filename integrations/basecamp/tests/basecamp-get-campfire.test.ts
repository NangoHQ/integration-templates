import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-campfire.js';

describe('basecamp get-campfire tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-campfire',
        Model: 'ActionOutput_basecamp_getcampfire'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
