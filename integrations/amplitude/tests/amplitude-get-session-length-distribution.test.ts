import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-session-length-distribution.js';

describe('amplitude get-session-length-distribution tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-session-length-distribution',
        Model: 'ActionOutput_amplitude_getsessionlengthdistribution'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
