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
import * as path from 'path';
import * as Q from 'q';
import {IMock, It, Mock, MockBehavior, Times} from 'typemoq';
import * as taskTypeDef from 'vsts-task-lib/task';
import * as trTypeDef from 'vsts-task-lib/toolrunner';

import * as deployGaeTypeDef from '../deploy-gae';

describe('unit tests', () => {
  // Modules to import after mockery setup.
  let execOptions: typeof commonExecTypeDef;
  let tr: typeof trTypeDef;
  let deployGae: typeof deployGaeTypeDef;
  let task: typeof taskTypeDef;

  // Mocks used in every test.
  let taskLibMock: IMock<typeof taskTypeDef>;
  let deployToolMock: IMock<trTypeDef.ToolRunner>;
  let endpointMock: IMock<commonExecTypeDef.Endpoint>;
  let checkVersionToolMock: IMock<trTypeDef.ToolRunner>;

  // Constants used by tests.
  const auth: taskTypeDef.EndpointAuthorization = {
    parameters : {
      certificate : '{"project_id": "projectId"}',
    },
    scheme : '',
  };
  const stdout = 'stdout';
  const stderr = 'stderr';

  // Inputs with defaults that can change in tests.
  let runOptions: deployGaeTypeDef.RunOptions;
  let execResult: trTypeDef.IExecResult;
  let checkVersionResult: trTypeDef.IExecResult;

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
    tr = require('vsts-task-lib/toolrunner');
    deployGae = require('../deploy-gae');
    task = require('vsts-task-lib/task');
    // ReSharper restore CommonJsExternalModule
    /* tslint:enable no-require-imports */
  });

  after('teardown mockery', (): void => {
    mockery.deregisterAll();
    mockery.disable();
  });

  beforeEach('initialize mocks', () => {
    checkVersionResult = {
      stdout : JSON.stringify(
          {['Google Cloud SDK'] : '174.0.0'}),
      code : 0,
      error : null,
      stderr : '',
    };

    checkVersionToolMock =
        Mock.ofType<trTypeDef.ToolRunner>(null, MockBehavior.Strict);
    checkVersionToolMock.setup(t => t.line(It.isAny()))
        .returns(() => checkVersionToolMock.object);
    checkVersionToolMock.setup(t => t.execSync(It.isAny()))
        .returns(() => checkVersionResult);

    taskLibMock.reset();
    taskLibMock.callBase = true;
    taskLibMock.setup(t => t.getEndpointAuthorization(It.isAny(), It.isAny()))
        .returns(() => auth);
    taskLibMock.setup(t => t.setResult(It.isAny(), It.isAny()));
    taskLibMock.setup(t => t.which(It.isAny(), It.isAny())).returns(() => '');
    taskLibMock.setup(t => t.tool(It.isAny()))
        .returns(() => checkVersionToolMock.object);
    taskLibMock.setup(t => t.tool(It.isAny()))
        .returns(() => deployToolMock.object);

    endpointMock = Mock.ofType(execOptions.Endpoint, MockBehavior.Strict);
    endpointMock.setup(e => e.using(It.isAny())).callBase();
    endpointMock.setup(e => e.usingAsync(It.isAny())).callBase();
    endpointMock.setup(e => e.initCredentials());
    endpointMock.setup(e => e.clearCredentials());
    endpointMock.setup(e => e.projectParam).callBase();

    execResult = {
      stdout,
      stderr,
      error : null,
      code : 0,
    };

    deployToolMock =
        Mock.ofType<trTypeDef.ToolRunner>(null, MockBehavior.Strict);
    deployToolMock.setup(r => r.line(It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(r => r.arg(It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(r => r.argIf(It.isAny(), It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(t => t.execSync(It.isAny())).returns(() => execResult);
    deployToolMock.setup(t => t.exec((It.isAny())))
        .returns(() => Q.resolve(execResult.code));
    const p = new Promise<number>((r) => r(4));
    p.then((i) => typeof i === 'number');

    runOptions = {
      endpoint : endpointMock.object,
      yamlFileName : 'app.yaml',
      deploymentPath : 'c:/deploy/path',
      copyYaml : false,
      promote : false,
      verbosity : 'info',
    };
  });

  it('should succeed', async () => {
    await deployGae.deployGae(runOptions);

    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should copy yaml from directory', async () => {
    runOptions.copyYaml = true;
    runOptions.yamlSource = 'c:/source/path';
    runOptions.yamlFileName = 'app.yaml';
    const appendedSource =
        path.join(runOptions.yamlSource, runOptions.yamlFileName);
    taskLibMock.setup(t => t.cp(appendedSource, runOptions.deploymentPath))
        .verifiable();

    await deployGae.deployGae(runOptions);

    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should copy yaml from file', async () => {
    runOptions.copyYaml = true;
    runOptions.yamlSource = 'c:/source/path/app.yaml';
    runOptions.yamlFileName = 'app.yaml';
    taskLibMock.setup(t => t.exist(It.isAny())).returns(() => false);
    taskLibMock
        .setup(t => t.cp(runOptions.yamlSource, runOptions.deploymentPath))
        .verifiable();

    await deployGae.deployGae(runOptions);

    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should set verbosity debug', async () => {
    runOptions.verbosity = 'debug';

    await deployGae.deployGae(runOptions);

    deployToolMock.verify(t => t.arg('--verbosity=debug'), Times.once());
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });
});
