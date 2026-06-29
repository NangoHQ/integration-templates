import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-items.js';

describe('exact-online list-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-items',
        Model: 'ActionOutput_exact_online_listitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
