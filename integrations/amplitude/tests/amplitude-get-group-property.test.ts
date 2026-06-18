import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-group-property.js';

describe('amplitude get-group-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-group-property',
        Model: 'ActionOutput_amplitude_getgroupproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
