import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-group-property.js';

describe('amplitude update-group-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-group-property',
        Model: 'ActionOutput_amplitude_updategroupproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
