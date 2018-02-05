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
import {Endpoint} from 'common/exec-options';
import * as Q from 'q';
import {It, Mock} from 'typemoq';
import * as task from 'vsts-task-lib/task';
import {ToolRunner} from 'vsts-task-lib/toolrunner';

import {getInstanceGroupIps} from '../instance-group-ips';

describe('unit-tests', () => {
  const taskMock = Mock.ofInstance(task);
  taskMock.setup(t => t.getEndpointAuthorization(It.isAny(), It.isAny()))
      .returns(() => {
        return {
          parameters : {
            ['certificate'] : JSON.stringify({project_id : 'mock-project-id'})
          },
        } as any as task.EndpointAuthorization;
      });
  const endpointMock =
      Mock.ofInstance(new Endpoint('', {task : taskMock.object}));
  const toolMock = Mock.ofType<ToolRunner>();
  const gcloudPath = 'gcloud-path';

  beforeEach(() => {
    endpointMock.reset();
    endpointMock.setup(e => e.usingAsync(It.isAny())).callBase();
    endpointMock.setup(e => e.initCredentials());
    endpointMock.setup(e => e.clearCredentials());
    endpointMock.setup(e => e.projectParam)
        .returns(() => '--project="mock-project-id"');

    taskMock.reset();
    taskMock.setup(t => t.which('gcloud')).returns(() => gcloudPath);
    taskMock.setup(t => t.tool(gcloudPath)).returns(() => toolMock.object);

    toolMock.reset();
    toolMock.setup(t => t.line(It.isAny())).returns(() => toolMock.object);
    toolMock.setup(t => t.arg(It.isAny())).returns(() => toolMock.object);
    // ReSharper disable once TsResolvedFromInaccessibleModule
    toolMock.setup(t => t.then).returns(() => undefined);
    toolMock.setup(t => t.toString()).returns(() => 'toolMock');
  });

  it('should fail on list-instances failure', async () => {
    const error = new Error('mock-error');
    toolMock.setup(t => t.on(It.isAny(), It.isAny))
        .returns(() => toolMock.object);
    toolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.reject<number>(error));

    try {
      const p = await getInstanceGroupIps({
        endpoint : endpointMock.object,
        locationScope : 'zone',
        location : 'zone-name',
        instanceGroupName : 'instance-group-name',
        buildVariableName : 'build.variable.name',
        di : {task : taskMock.object},
      });
      assert.fail(p, '');
    } catch (e) {
      if (e === error) {
        return;
      } else {
        throw e;
      }
    }
  });
});
