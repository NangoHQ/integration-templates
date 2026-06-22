import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-numbers.js';

describe('aircall list-numbers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-numbers',
        Model: 'ActionOutput_aircall_basic_listnumbers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
