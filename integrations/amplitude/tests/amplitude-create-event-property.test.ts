import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-event-property.js';

describe('amplitude create-event-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-event-property',
        Model: 'ActionOutput_amplitude_createeventproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
