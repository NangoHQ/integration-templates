import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-index.js';

describe('algolia move-index tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-index',
        Model: 'ActionOutput_algolia_moveindex'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
