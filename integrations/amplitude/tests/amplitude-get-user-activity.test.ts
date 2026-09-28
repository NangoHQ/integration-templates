import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-activity.js';

describe('amplitude get-user-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-activity',
        Model: 'ActionOutput_amplitude_getuseractivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
