import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-hooks.js';

describe('make list-hooks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-hooks',
        Model: 'ActionOutput_make_listhooks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
