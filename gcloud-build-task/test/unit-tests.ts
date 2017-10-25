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

import * as commonExecTypeDef from 'common/exec-options';
import * as mockery from 'mockery';
import {IMock, It, Mock, MockBehavior, Times} from 'typemoq';
import * as taskTypeDef from 'vsts-task-lib/task';
import * as trTypeDef from 'vsts-task-lib/toolrunner';

import * as gcloudTypeDef from '../gcloud-build-task';

describe('unit tests', () => {
  // Modules to import after mockery setup.
  let execOptions: typeof commonExecTypeDef;
  let tr: typeof trTypeDef;
  let gcloud: typeof gcloudTypeDef;
  let task: typeof taskTypeDef;

  // Mocks used in every test.
  let mockedTaskLib: IMock<typeof taskTypeDef>;
  let gcloudToolMock: IMock<trTypeDef.ToolRunner>;
  let endpointMock: IMock<commonExecTypeDef.Endpoint>;

  // Constants used by tests.
  const command = 'some command';
  const auth: taskTypeDef.EndpointAuthorization = {
    parameters : {
      certificate : '{"project_id": "projectId"}',
    },
    scheme : '',
  };
  const stdout = 'stdout';
  const stderr = 'stderr';

  // Inputs with defaults that can change in tests.
  let runOptions: gcloudTypeDef.RunGcloudOptions;
  let execResult: trTypeDef.IExecResult;

  before('setup mockery', () => {
    /* tslint:disable no-require-imports */
    // ReSharper disable CommonJsExternalModule
    mockedTaskLib =
      Mock.ofInstance(require('vsts-task-lib/task'), MockBehavior.Strict);
    mockedTaskLib.setup(t => t.TaskResult)
      .callBase()
      .verifiable(Times.atLeast(0));
    mockery.enable({
      useCleanCache : true,
      warnOnUnregistered : false,
    });
    mockery.registerMock('vsts-task-lib/task', mockedTaskLib.object);

    execOptions = require('common/exec-options');
    tr = require('vsts-task-lib/toolrunner');
    gcloud = require('../gcloud-build-task');
    task = require('vsts-task-lib/task');
    // ReSharper restore CommonJsExternalModule
    /* tslint:enable no-require-imports */
  });

  after('teardown mockery', (): void => {
    mockery.deregisterAll();
    mockery.disable();
  });

  beforeEach('initialize mocks', () => {
    mockedTaskLib.reset();
    mockedTaskLib.setup(t => t.getEndpointAuthorization(It.isAny(), It.isAny()))
        .returns(() => auth);
    mockedTaskLib.setup(t => t.TaskResult)
        .callBase()
        .verifiable(Times.atLeast(0));
    endpointMock = Mock.ofType(execOptions.Endpoint, MockBehavior.Strict);
    endpointMock.setup(e => e.using(It.isAny())).callBase();
    endpointMock.setup(e => e.initCredentials());
    endpointMock.setup(e => e.clearCredentials());
    endpointMock.setup(e => e.projectParam).callBase();

    execResult = {
      stdout,
      stderr,
      error : null,
      code : 0,
    };

    gcloudToolMock =
        Mock.ofType(tr.ToolRunner, MockBehavior.Strict, true, 'gcloud');
    gcloudToolMock.setup(r => r.line(It.isValue(command)))
        .returns(() => gcloudToolMock.object)
        .verifiable();
    gcloudToolMock
        .setup(r => r.arg(It.isValue(execOptions.Endpoint.credentialParam)))
        .returns(() => gcloudToolMock.object)
        .verifiable();
    gcloudToolMock
        .setup(r => r.argIf(It.isAny(),
                            It.isValue(endpointMock.object.projectParam)))
        .returns(() => gcloudToolMock.object);
    gcloudToolMock.setup(t => t.execSync(It.isAny()))
        .returns(() => execResult)
        .verifiable();

    runOptions = {
      endpoint : endpointMock.object,
      gcloudTool : gcloudToolMock.object,
      command,
      includeProjectParam : false,
      ignoreReturnCode : false,
    };
  });

  it('should succeed running some command', () => {

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should fail on tool exception', () => {
    const errorMessage = 'Tested error.';
    execResult.error = {
      name : 'Testing',
      message : errorMessage,
    };

    mockedTaskLib.setup(t => t.error(It.isValue(errorMessage))).verifiable();
    mockedTaskLib
        .setup(t => t.setResult(It.isValue(task.TaskResult.Failed),
                                It.isValue(errorMessage)))
        .verifiable();

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should fail on gcloud error return code', () => {
    execResult.code = -1;
    mockedTaskLib.setup(t => t.error(It.isValue(stderr)));
    mockedTaskLib.setup(t => t.setResult(It.isValue(task.TaskResult.Failed),
                                         It.isValue(stderr)));

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should fail on gcloud error return code with no sdterr', () => {
    execResult.stderr = '';
    execResult.code = -1;
    mockedTaskLib.setup(t => t.error(It.isValue(stdout)));
    mockedTaskLib.setup(t => t.setResult(It.isValue(task.TaskResult.Failed),
                                         It.isValue(stdout)));

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should succeed on gcloud error return code with ignoreReturnCode=true',
     () => {
       runOptions.ignoreReturnCode = true;
       execResult.code = -1;

       gcloud.runGcloud(runOptions);

       gcloudToolMock.verifyAll();
       mockedTaskLib.verifyAll();
     });

  it('should set variable', () => {
    const variableName = 'taskOutVariable';
    runOptions.outputVariable = variableName;
    mockedTaskLib.setup(t => t.setVariable(variableName, stdout)).verifiable();

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should not include project param', () => {
    runOptions.includeProjectParam = false;

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verify(r => r.argIf(It.isValue(false), It.isAny()),
                          Times.once());
    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });

  it('should include project param', () => {
    runOptions.includeProjectParam = true;

    gcloud.runGcloud(runOptions);

    gcloudToolMock.verify(r => r.argIf(It.isValue(true), It.isAny()),
                          Times.once());
    gcloudToolMock.verifyAll();
    mockedTaskLib.verifyAll();
  });
});
