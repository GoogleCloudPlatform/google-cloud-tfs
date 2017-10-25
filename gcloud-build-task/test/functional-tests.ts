// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {spawn} from 'child_process';
import * as task from 'vsts-task-lib/task';

describe('functional tests', function(): void {
  this.timeout(0);

  it('should run gcloud version', async () => {
    const gcloudPromise = new Promise<string>((resolve) => {
      const cp = spawn('gcloud', [ 'version' ], {shell : true});
      cp.on('exit', () => resolve(cp.stdout.read().toString()));
    });
    process.env['INPUT_serviceEndpoint'] = 'endpoint';
    process.env['ENDPOINT_AUTH_endpoint'] = JSON.stringify({
      parameters : {certificate : JSON.stringify({project_id : 'projectId'})}
    });
    process.env['INPUT_command'] = 'version';
    process.env['INPUT_includeProjectParam'] = false;
    process.env['INPUT_ignoreReturnCode'] = false;
    const variableName = 'outputVariable';
    process.env['INPUT_outputVariable'] = variableName;

    // TODO(jimwp): This is fragile. It will be broken by the next version of
    // vsts-task-lib.
    task._loadData();

    // Run the task.
    // ReSharper disable once CommonJsExternalModule
    /* tslint:disable-next-line no-require-imports */
    require('../run');

    const gcloudVersionOutput = await gcloudPromise;
    assert.equal(process.env[variableName], gcloudVersionOutput);
  });
});
