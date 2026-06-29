import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-live-soundbite.js';

describe('fireflies create-live-soundbite tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-live-soundbite',
        Model: 'ActionOutput_fireflies_createlivesoundbite'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
