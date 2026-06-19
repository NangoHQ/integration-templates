import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-event-properties.js';

describe('amplitude list-event-properties tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-event-properties',
        Model: 'ActionOutput_amplitude_listeventproperties'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
