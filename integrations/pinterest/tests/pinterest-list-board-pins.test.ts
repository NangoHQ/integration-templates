import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-board-pins.js';

describe('pinterest list-board-pins tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-board-pins',
        Model: 'ActionOutput_pinterest_listboardpins'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
