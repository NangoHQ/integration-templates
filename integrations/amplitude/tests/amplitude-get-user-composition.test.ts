import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-composition.js';

describe('amplitude get-user-composition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-composition',
        Model: 'ActionOutput_amplitude_getusercomposition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
