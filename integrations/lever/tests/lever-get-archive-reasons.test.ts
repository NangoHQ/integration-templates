import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-archive-reasons.js';

describe('lever-basic get-archive-reasons tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-archive-reasons',
        Model: 'ActionOutput_lever_basic_getarchivereasons'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
