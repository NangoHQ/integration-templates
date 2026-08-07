import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-aic-roi-kpis.js';

describe('zoom-cc get-aic-roi-kpis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-aic-roi-kpis',
        Model: 'ActionOutput_zoom_cc_getaicroikpis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
