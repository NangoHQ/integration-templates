import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-lock-settings.js';

describe('zoom-cc update-lock-settings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-lock-settings',
        Model: 'ActionOutput_zoom_cc_updatelocksettings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
