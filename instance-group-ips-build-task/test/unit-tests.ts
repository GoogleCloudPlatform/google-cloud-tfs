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
import {IMock, It, Mock, MockBehavior, Times} from 'typemoq';
import * as task from 'vsts-task-lib/task';
import {ToolRunner} from 'vsts-task-lib/toolrunner';

import {
  getInstanceGroupIps,
  GetInstanceGroupIpsOptions,
} from '../instance-group-ips';

/**
 * @fileoverview Unit tests that mock gcloud tool invocations.
 * @author jimwp@google.com (Jim Przybylinski)
 */

describe('unit-tests', () => {
  let taskMock = Mock.ofInstance(task);
  taskMock.setup(t => t.getEndpointAuthorization(It.isAny(), It.isAny()))
      .returns(() => {
        return {
          parameters : {
            ['certificate'] : JSON.stringify({project_id : 'mock-project-id'}),
          },
          scheme : '',
        } as task.EndpointAuthorization;
      });
  const endpoint = new Endpoint('', {task : taskMock.object});
  let endpointMock: IMock<Endpoint>;
  let gcloudToolMock: IMock<ToolRunner>;
  let groupListInstancesToolMock: IMock<ToolRunner>;
  let listInstancesToolMock: IMock<ToolRunner>;
  const gcloudPath = 'gcloud-path';
  let defaultOptions: GetInstanceGroupIpsOptions;

  beforeEach(() => {
    endpointMock = Mock.ofInstance(endpoint, MockBehavior.Strict);
    endpointMock.setup(e => e.usingAsync(It.isAny())).callBase();
    endpointMock.setup(e => e.initCredentials());
    endpointMock.setup(e => e.clearCredentials());
    endpointMock.setup(e => e.projectParam)
        .returns(() => '--project="mock-project-id"');

    taskMock = Mock.ofInstance(task);
    taskMock.setup(t => t.which('gcloud')).returns(() => gcloudPath);
    taskMock.setup(t => t.tool(gcloudPath))
        .returns(() => gcloudToolMock.object);

    groupListInstancesToolMock = Mock.ofType<ToolRunner>();
    groupListInstancesToolMock.setup(t => t.arg(It.isAny()))
        .returns(() => groupListInstancesToolMock.object);

    listInstancesToolMock = Mock.ofType<ToolRunner>();
    listInstancesToolMock.setup(t => t.arg(It.isAny()))
        .returns(() => listInstancesToolMock.object);

    gcloudToolMock = Mock.ofType<ToolRunner>();
    gcloudToolMock.setup(t => t.line('compute instance-groups list-instances'))
        .returns(() => groupListInstancesToolMock.object);
    gcloudToolMock.setup(t => t.line('compute instances list'))
        .returns(() => listInstancesToolMock.object);

    defaultOptions = {
      endpoint : endpointMock.object,
      locationScope : 'zone',
      location : 'default-zone-name',
      instanceGroupName : 'default-instance-group-name',
      buildVariableName : 'default.build.variable.name',
      di : {task : taskMock.object},
    };
  });

  it('should fail on instance-groups list-instances failure', async () => {
    const error = new Error('mock-error');
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .returns(() => groupListInstancesToolMock.object);
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.reject<number>(error));

    const promise = getInstanceGroupIps(defaultOptions);

    await promise.then(() => assert.fail('', '', 'Expected an error.'))
        .catch((e: {}) => assert.equal(error, e));
  });

  it('should fail on instances list failure', async () => {
    const error = new Error('mock-error');
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback('instance-name,zone-name'))
        .returns(() => groupListInstancesToolMock.object);
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .returns(() => listInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.reject<number>(error));

    const promise = getInstanceGroupIps(defaultOptions);

    await promise.then(() => assert.fail('', '', 'Expected an error.'))
        .catch((e: {}) => assert.equal(error, e));
  });

  it('should set the variable for a single ip', async () => {
    const ipaddress = 'ipaddress';
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback('instance-name,zone-name'))
        .returns(() => groupListInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback(ipaddress))
        .returns(() => listInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    defaultOptions.buildVariableName = 'build.variable.name';

    await getInstanceGroupIps(defaultOptions);

    taskMock.verify(
        t => t.setVariable(defaultOptions.buildVariableName, ipaddress),
        Times.once());
  });

  it('should call list-instances for the given instance group.', async () => {
    const ipaddress = 'adderess';
    const instanceGroupName = 'test-group-name';
    const locationScope = 'region';
    const regionName = 'us-central1';
    defaultOptions.instanceGroupName = instanceGroupName;
    defaultOptions.locationScope = locationScope;
    defaultOptions.location = regionName;
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback('instance-name,zone-name'))
        .returns(() => groupListInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback(ipaddress))
        .returns(() => listInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));

    await getInstanceGroupIps(defaultOptions);

    groupListInstancesToolMock.verify(t => t.arg(instanceGroupName),
                                      Times.once());
    groupListInstancesToolMock.verify(t => t.arg('--region'), Times.once());
    groupListInstancesToolMock.verify(t => t.arg(regionName), Times.once());
  });

  it('should call instances list filtering for the returned instances.',
     async () => {
       const ipaddress = 'adderess';
       groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
           .returns(() => Q.resolve(0));
       groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
           .returns((_event: string, callback: (...line: Array<{}>) => {}) => {
             callback('test-instance-1,test-zone-1',
                      'test-instance-2,test-zone-2');
             return groupListInstancesToolMock.object;
           });
       listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
           .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                         callback(ipaddress))
           .returns(() => listInstancesToolMock.object);
       listInstancesToolMock.setup(t => t.exec(It.isAny()))
           .returns(() => Q.resolve(0));

       await getInstanceGroupIps(defaultOptions);

       listInstancesToolMock.verify(
           t => t.arg('"(name=test-instance-1 AND zone:test-zone-1)' +
                      ' OR ' +
                      '(name=test-instance-2 AND zone:test-zone-2)"'),
           Times.once());
     });

  it('should set the variable for multiple ips', async () => {
    const ipaddresses = [ 'address1', 'address2' ];
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback('instance-name,zone-name'))
        .returns(() => groupListInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback(...ipaddresses))
        .returns(() => listInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    defaultOptions.buildVariableName = 'other.build.variable.name';

    await getInstanceGroupIps(defaultOptions);

    taskMock.verify(t => t.setVariable(defaultOptions.buildVariableName,
                                       'address1,address2'),
                    Times.once());
  });

  it('should use the given separator for multiple ips', async () => {
    const ipaddresses = [ '1', '2' ];
    groupListInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    groupListInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback('instance-name,zone-name'))
        .returns(() => groupListInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.on('stdline', It.isAny()))
        .callback((_event: string, callback: (...line: Array<{}>) => {}) =>
                      callback(...ipaddresses))
        .returns(() => listInstancesToolMock.object);
    listInstancesToolMock.setup(t => t.exec(It.isAny()))
        .returns(() => Q.resolve(0));
    defaultOptions.buildVariableName = 'other.build.variable.name';
    defaultOptions.separator = ' & ';

    await getInstanceGroupIps(defaultOptions);

    taskMock.verify(
        t => t.setVariable(defaultOptions.buildVariableName, '1 & 2'),
        Times.once());
  });
});
