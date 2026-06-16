import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-event-property.js';

describe('amplitude get-event-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-event-property',
        Model: 'ActionOutput_amplitude_geteventproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
