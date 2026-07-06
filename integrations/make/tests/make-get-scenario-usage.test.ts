import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-scenario-usage.js';

describe('make get-scenario-usage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-scenario-usage',
        Model: 'ActionOutput_make_getscenariousage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
