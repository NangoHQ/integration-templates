import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-webinar-participant-qos.js';

describe('zoom-cc get-webinar-participant-qos tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-webinar-participant-qos',
        Model: 'ActionOutput_zoom_cc_getwebinarparticipantqos'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
