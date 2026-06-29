import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-meeting-state.js';

describe('fireflies update-meeting-state tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-meeting-state',
        Model: 'ActionOutput_fireflies_updatemeetingstate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
