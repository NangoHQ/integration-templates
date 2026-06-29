import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-askfred-thread.js';

describe('fireflies get-askfred-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-askfred-thread',
        Model: 'ActionOutput_fireflies_getaskfredthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
