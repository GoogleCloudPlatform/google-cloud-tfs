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

import * as kubectlTypeDef from '../kubectl-build-task';

describe('unit tests', () => {
  // Modules to import after mockery setup.
  let execOptions: typeof commonExecTypeDef;
  let kubectl: typeof kubectlTypeDef;
  let task: typeof taskTypeDef;

  // Mocks used in every test.
  let taskLibMock: IMock<typeof taskTypeDef>;
  let kubectlToolMock: IMock<trTypeDef.ToolRunner>;
  let endpointMock: IMock<commonExecTypeDef.KubeEndpoint>;

  // Constants used by tests.
  const command = 'some command';
  const auth: taskTypeDef.EndpointAuthorization = {
    parameters : {certificate : '{"project_id": "projectId"}'},
    scheme : '',
  };
  const stdout = 'stdout';
  const stderr = 'stderr';

  // Inputs with defaults that can change in tests.
  let runOptions: kubectlTypeDef.RunKubectlOptions;
  let execResult: trTypeDef.IExecSyncResult;

  before('setup mockery', () => {
    /* tslint:disable no-require-imports */
    // ReSharper disable CommonJsExternalModule
    taskLibMock = Mock.ofInstance(require('vsts-task-lib/task'));
    taskLibMock.callBase = true;
    mockery.enable({
      useCleanCache : true,
      warnOnUnregistered : false,
    });
    mockery.registerMock('vsts-task-lib/task', taskLibMock.object);

    execOptions = require('common/exec-options');
    kubectl = require('../kubectl-build-task');
    task = require('vsts-task-lib/task');
    // ReSharper restore CommonJsExternalModule
    /* tslint:enable no-require-imports */
  });

  after('teardown mockery', (): void => {
    mockery.deregisterAll();
    mockery.disable();
  });

  beforeEach('initialize mocks', () => {
    taskLibMock.reset();
    taskLibMock.callBase = true;
    taskLibMock.setup(t => t.getEndpointAuthorization(It.isAny(), It.isAny()))
        .returns(() => auth);
    taskLibMock.setup(t => t.setResult(It.isAny(), It.isAny()));

    endpointMock = Mock.ofType(execOptions.KubeEndpoint, MockBehavior.Strict);
    endpointMock.setup(e => e.using(It.isAny())).callBase();
    endpointMock.setup(e => e.initCredentials());
    endpointMock.setup(e => e.clearCredentials());
    endpointMock.setup(e => e.defaultKubectlExecOptions).callBase();

    execResult = {
      stdout,
      stderr,
      error : null,
      code : 0,
    };

    kubectlToolMock =
        Mock.ofType<trTypeDef.ToolRunner>(null, MockBehavior.Strict);
    kubectlToolMock.setup(r => r.line(command))
        .returns(() => kubectlToolMock.object)
        .verifiable();
    kubectlToolMock.setup(r => r.arg(execOptions.KubeEndpoint.kubeConfigParam))
        .returns(() => kubectlToolMock.object)
        .verifiable();
    kubectlToolMock.setup(t => t.execSync(It.isAny()))
        .returns(() => execResult)
        .verifiable();

    runOptions = {
      endpoint : endpointMock.object,
      kubectlTool : kubectlToolMock.object,
      command,
      ignoreReturnCode : false,
    };
  });

  it('should succeed with simple execution', () => {
    kubectl.runKubectl(runOptions);

    kubectlToolMock.verifyAll();
    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should succeed with execution of command that starts with kubectl',
     () => {
       runOptions.command = ` kubectl ${command} `;

       kubectl.runKubectl(runOptions);

       kubectlToolMock.verifyAll();
       taskLibMock.verifyAll();
       taskLibMock.verify(
           t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
           Times.once());
     });

  it('should succeed with execution of command that with kubectl in the middle',
     () => {
       runOptions.command = ` kubectl ${command} kubectl `;
       const cmdExpression = (r: trTypeDef.ToolRunner) =>
           r.line(`${command} kubectl`);
       kubectlToolMock.setup(cmdExpression)
           .returns(() => kubectlToolMock.object);

       kubectl.runKubectl(runOptions);

       kubectlToolMock.verify(cmdExpression, Times.once());
       taskLibMock.verifyAll();
       taskLibMock.verify(
           t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
           Times.once());
     });

  it('should fail on tool exception', () => {
    const errorMessage = 'Tested error.';
    execResult.error = {
      name : 'Testing',
      message : errorMessage,
    };

    kubectl.runKubectl(runOptions);

    kubectlToolMock.verifyAll();
    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Failed, errorMessage),
                       Times.once());
  });

  it('should fail on kubectl error return code', () => {
    execResult.code = -1;

    kubectl.runKubectl(runOptions);

    kubectlToolMock.verifyAll();
    taskLibMock.verifyAll();
    taskLibMock.verify(
        t => t.setResult(task.TaskResult.Failed, 'kubectl returned code -1'),
        Times.once());
  });

  it('should fail on kubectl error return code with no sdterr', () => {
    execResult.stderr = '';
    execResult.code = -1;

    kubectl.runKubectl(runOptions);

    kubectlToolMock.verifyAll();
    taskLibMock.verifyAll();
    taskLibMock.verify(
        t => t.setResult(task.TaskResult.Failed, 'kubectl returned code -1'),
        Times.once());
  });

  it('should succeed on kubectl error return code with ignoreReturnCode=true',
     () => {
       runOptions.ignoreReturnCode = true;
       execResult.code = -1;

       kubectl.runKubectl(runOptions);

       kubectlToolMock.verifyAll();
       taskLibMock.verifyAll();
       taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded,
                                           'kubectl returned code -1'),
                          Times.once());
     });

  it('should set variable', () => {
    const variableName = 'taskOutVariable';
    runOptions.outputVariable = variableName;
    taskLibMock.setup(t => t.setVariable(variableName, stdout)).verifiable();

    kubectl.runKubectl(runOptions);

    kubectlToolMock.verifyAll();
    taskLibMock.verifyAll();
    taskLibMock.verify(
        t => t.setResult(task.TaskResult.Succeeded, 'kubectl returned code 0'),
        Times.once());
  });
});
