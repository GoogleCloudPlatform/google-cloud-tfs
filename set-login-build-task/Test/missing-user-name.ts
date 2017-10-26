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
 * @fileoverview This is a test script for the set-login-build-task with
 *   a missing user name input and a "given" userNameType input.
 * @author przybjw@google.com (Jim Przybylinski)
 */

import { TaskLibAnswers } from 'vsts-task-lib/mock-answer';
import { TaskMockRunner } from 'vsts-task-lib/mock-run';
import { registerCommonMocks, getDefaultAnswers } from 'common/register-mocks';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'set-login.js');
const runner = new TaskMockRunner(taskPath);

runner.setInput('serviceEndpoint', 'endpointId');
runner.setInput('zone', 'zoneId');
runner.setInput('machine', 'instanceId');
runner.setInput('userNameType', 'given');
runner.setInput('userNameOutput', 'userNameVar');
runner.setInput('passwordOutput', 'passwordVar');
runner.setInput('machineIpOutput', 'ipVar');

const answers: TaskLibAnswers = getDefaultAnswers();

runner.setAnswers(answers);
registerCommonMocks(runner);
runner.run();
