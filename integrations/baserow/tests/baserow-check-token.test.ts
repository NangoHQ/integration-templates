import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/check-token.js';

describe('baserow check-token tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'check-token',
        Model: 'ActionOutput_baserow_checktoken'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
