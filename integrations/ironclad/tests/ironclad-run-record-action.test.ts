import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/run-record-action.js';

describe('ironclad run-record-action tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'run-record-action',
        Model: 'ActionOutput_ironclad_runrecordaction'
    });

    it('should throw an ActionError instead of returning the error body when the tenant lacks the Obligations add-on', async () => {
        const input = await nangoMock.getInput();

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow();
    });
});
