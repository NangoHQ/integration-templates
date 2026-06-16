import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/group-identify.js';

describe('amplitude group-identify tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'group-identify',
        Model: 'ActionOutput_amplitude_groupidentify'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
