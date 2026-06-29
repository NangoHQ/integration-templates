import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-askfred-thread.js';

describe('fireflies create-askfred-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-askfred-thread',
        Model: 'ActionOutput_fireflies_createaskfredthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
