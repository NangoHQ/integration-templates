import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-opportunity-sources.js';

describe('lever-basic update-opportunity-sources tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity-sources',
        Model: 'ActionOutput_lever_basic_updateopportunitysources'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
