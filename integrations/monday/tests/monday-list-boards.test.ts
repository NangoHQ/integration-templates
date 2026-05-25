import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-boards.js';

describe('monday list-boards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-boards',
        Model: 'ActionOutput_monday_listboards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
