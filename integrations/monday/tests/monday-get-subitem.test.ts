import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-subitem.js';

describe('monday get-subitem tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-subitem',
        Model: 'ActionOutput_monday_getsubitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
