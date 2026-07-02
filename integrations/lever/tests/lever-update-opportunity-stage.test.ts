import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-opportunity-stage.js';

describe('lever-basic update-opportunity-stage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity-stage',
        Model: 'ActionOutput_lever_basic_updateopportunitystage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
