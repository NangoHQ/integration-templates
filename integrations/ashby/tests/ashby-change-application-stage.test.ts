import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/change-application-stage.js';

describe('ashby change-application-stage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'change-application-stage',
        Model: 'ActionOutput_ashby_changeapplicationstage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
