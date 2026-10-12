import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-all-time-since-today.js';

describe('wakatime get-all-time-since-today tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-all-time-since-today',
        Model: 'ActionOutput_wakatime_getalltimesincetoday'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
