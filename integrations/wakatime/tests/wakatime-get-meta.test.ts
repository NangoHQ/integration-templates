import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-meta.js';

describe('wakatime get-meta tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-meta',
        Model: 'ActionOutput_wakatime_getmeta'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
