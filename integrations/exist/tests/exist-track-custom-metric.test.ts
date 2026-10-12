import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/track-custom-metric.js';

describe('exist track-custom-metric tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'track-custom-metric',
        Model: 'ActionOutput_exist_trackcustommetric'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
