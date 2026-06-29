import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-to-live.js';

describe('fireflies add-to-live tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-to-live',
        Model: 'ActionOutput_fireflies_addtolive'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
