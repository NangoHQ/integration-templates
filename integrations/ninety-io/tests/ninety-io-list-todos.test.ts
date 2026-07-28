import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-todos.js';

describe('ninety-io list-todos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-todos',
        Model: 'ActionOutput_ninety_io_listtodos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
