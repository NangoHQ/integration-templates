import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-board.js';

describe('pinterest update-board tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-board',
        Model: 'ActionOutput_pinterest_updateboard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
