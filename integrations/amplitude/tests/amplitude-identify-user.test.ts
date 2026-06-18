import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/identify-user.js';

describe('amplitude identify-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'identify-user',
        Model: 'ActionOutput_amplitude_identifyuser'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
