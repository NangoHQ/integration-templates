import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-event-categories.js';

describe('pipelinecrm list-event-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-event-categories',
        Model: 'ActionOutput_pipelinecrm_listeventcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
