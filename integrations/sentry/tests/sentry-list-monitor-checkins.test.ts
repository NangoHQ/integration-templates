import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-monitor-checkins.js';

describe('sentry list-monitor-checkins tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-monitor-checkins',
        Model: 'ActionOutput_sentry_listmonitorcheckins'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
