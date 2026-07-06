import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/import-events.js';

describe('mixpanel import-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'import-events',
        Model: 'ActionOutput_mixpanel_importevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
