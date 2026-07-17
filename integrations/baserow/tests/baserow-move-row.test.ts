import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-row.js';

describe('baserow move-row tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-row',
        Model: 'ActionOutput_baserow_moverow'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
