import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-project-task.js';

describe('xero update-project-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-project-task',
        Model: 'ActionOutput_xero_updateprojecttask'
    });

    it('should output the action output that is expected', async () => {
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                tenant_id: '27e853de-cfdc-4bf3-85e9-3979ee2bcaba'
            },
            metadata: {}
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
