import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-design-resize-job.js';

describe('canva create-design-resize-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-design-resize-job',
        Model: 'ActionOutput_canva_createdesignresizejob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
