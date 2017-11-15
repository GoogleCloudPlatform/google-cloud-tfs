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

/**
 * @fileoverview This is a test script for the deploy-gae-build-task with
 *   a failure in gcloud.
 * @author przybjw@google.com (Jim Przybylinski)
 */

import * as mock from 'common/register-mocks';
import * as path from 'path';
import {TaskLibAnswers} from 'vsts-task-lib/mock-answer';
import {TaskMockRunner} from 'vsts-task-lib/mock-run';

import * as strings from './test-strings';

const taskPath = path.join(__dirname, '..', 'run.js');
const runner = new TaskMockRunner(taskPath);

runner.setInput('serviceEndpoint', 'endpoint');
runner.setInput('deploymentPath', strings.deployPath);
runner.setInput('yamlFileName', 'app.yaml');
runner.setInput('copyYaml', 'false');
runner.setInput('promote', 'true');
runner.setInput('stopPrevious', 'true');

const execString = [
  mock.gcloudPath,
  'app deploy --quiet --verbosity=info',
  strings.yamlParam,
  strings.credentialParam,
  strings.projectParam,
  strings.versionParam,
  '--promote',
  '--stop-previous-version',
].join(' ');

const answers: TaskLibAnswers = mock.getDefaultAnswers();
answers.exec[execString] = {
  'code': 1,
  'stdout': '[gcloud output]',
  'stderr': '[gcloud error]'
};

runner.setAnswers(answers);
mock.registerCommonMocks(runner);

runner.run();
