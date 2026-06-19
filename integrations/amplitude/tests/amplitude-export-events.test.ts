import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/export-events.js';

describe('amplitude export-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'export-events',
        Model: 'ActionOutput_amplitude_exportevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
