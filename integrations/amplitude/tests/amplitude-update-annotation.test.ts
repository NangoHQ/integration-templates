import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-annotation.js';

describe('amplitude update-annotation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-annotation',
        Model: 'ActionOutput_amplitude_updateannotation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
