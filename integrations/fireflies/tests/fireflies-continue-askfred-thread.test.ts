import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/continue-askfred-thread.js';

describe('fireflies continue-askfred-thread tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'continue-askfred-thread',
        Model: 'ActionOutput_fireflies_continueaskfredthread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
