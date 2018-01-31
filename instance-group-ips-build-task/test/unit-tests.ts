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

import {Endpoint} from 'common/exec-options';
import {Mock} from 'typemoq';
import * as task from 'vsts-task-lib/task';
import {ToolRunner} from 'vsts-task-lib/toolrunner';

import {getInstanceGroupIps} from './instance-group-ips';

describe('unit-tests', () => {
  const taskMock = Mock.ofInstance(task);
  const endpointMock = Mock.ofType<Endpoint>();
  const toolMock = Mock.ofType<ToolRunner>();

  it('should fail on list-instances failure', async () => {
    
  });
});
