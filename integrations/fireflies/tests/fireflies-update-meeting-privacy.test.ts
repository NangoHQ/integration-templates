import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-meeting-privacy.js';

describe('fireflies update-meeting-privacy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-meeting-privacy',
        Model: 'ActionOutput_fireflies_updatemeetingprivacy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
