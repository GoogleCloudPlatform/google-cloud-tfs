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

import * as execOptionsTypeDef from 'common/exec-options';
import * as mockery from 'mockery';
import * as path from 'path';
import * as Q from 'q';
import {IMock, It, Mock, MockBehavior, Times} from 'typemoq';
import * as taskTypeDef from 'vsts-task-lib/task';
import * as trTypeDef from 'vsts-task-lib/toolrunner';

import * as deployGaeTypeDef from '../deploy-gae';

describe('unit tests', () => {
  // Modules to import after mockery setup.
  let execOptions: typeof execOptionsTypeDef;
  let deployGae: typeof deployGaeTypeDef;
  let task: typeof taskTypeDef;

  // Mocks used in every test.
  let taskLibMock: IMock<typeof taskTypeDef>;
  let deployToolMock: IMock<trTypeDef.ToolRunner>;
  let endpointMock: IMock<execOptionsTypeDef.Endpoint>;
  let checkVersionToolMock: IMock<trTypeDef.ToolRunner>;

  // Constants used by tests.
  const auth: taskTypeDef.EndpointAuthorization = {
    parameters : {certificate : '{"project_id": "project-id"}'},
    scheme : '',
  };
  const stdout = 'stdout';
  const stderr = 'stderr';

  // Inputs with defaults that can change in tests.
  let runOptions: deployGaeTypeDef.RunOptions;
  let execResult: trTypeDef.IExecSyncResult;
  let checkVersionResult: trTypeDef.IExecSyncResult;

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
      stdout : JSON.stringify({['Google Cloud SDK'] : '174.0.0'}),
      code : 0,
      error : null,
      stderr : '',
    };

    checkVersionToolMock =
        Mock.ofType<trTypeDef.ToolRunner>(undefined, MockBehavior.Strict);
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
    endpointMock.setup(e => e.projectId).callBase();

    execResult = {
      stdout,
      stderr,
      error : null,
      code : 0,
    };

    deployToolMock =
        Mock.ofType<trTypeDef.ToolRunner>(undefined, MockBehavior.Strict);
    deployToolMock.setup(r => r.line(It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(r => r.arg(It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(r => r.argIf(It.isAny(), It.isAny()))
        .returns(() => deployToolMock.object);
    deployToolMock.setup(t => t.execSync(It.isAny())).returns(() => execResult);
    deployToolMock.setup(t => t.exec((It.isAny())))
        .returns(() => Q.resolve(execResult.code));

    runOptions = {
      endpoint : endpointMock.object,
      yamlFileName : 'app.yaml',
      deploymentPath : 'c:/deploy/path',
      promote : false,
      verbosity : 'info',
    };
  });

  it('should succeed', async () => {
    await deployGae.deployGae(runOptions);

    deployToolMock.verify(
        t => t.argIf(undefined,
                     It.is<string>(arg => arg.includes('--image-url'))),
        Times.once());
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should copy yaml from directory', async () => {
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
    runOptions.yamlSource = 'c:/source/path/app.yaml';
    runOptions.yamlFileName = 'app.yaml';
    const appendedSource =
        path.join(runOptions.yamlSource, runOptions.yamlFileName);
    taskLibMock.setup(t => t.exist(appendedSource)).returns(() => false);
    taskLibMock
        .setup(t => t.cp(runOptions.yamlSource!, runOptions.deploymentPath))
        .verifiable();

    await deployGae.deployGae(runOptions);

    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should copy yaml from an oddly named directory', async () => {
    runOptions.yamlSource = 'c:/source/path/app.yaml';
    runOptions.yamlFileName = 'app.yaml';
    const appendedSource =
        path.join(runOptions.yamlSource, runOptions.yamlFileName);
    taskLibMock.setup(t => t.exist(appendedSource)).returns(() => true);
    taskLibMock.setup(t => t.cp(appendedSource, runOptions.deploymentPath))
        .verifiable();

    await deployGae.deployGae(runOptions);

    taskLibMock.verifyAll();
    taskLibMock.verify(t => t.setResult(task.TaskResult.Succeeded, It.isAny()),
                       Times.once());
  });

  it('should deploy to an image url', async () => {
    const imageUrl = 'gcr.io/repo-project-id/image-name:image-tag';
    runOptions.imageUrl = imageUrl;

    await deployGae.deployGae(runOptions);

    deployToolMock.verify(t => t.argIf(imageUrl, `--image-url="${imageUrl}"`),
                          Times.once());
  });

  it('should deploy to an image url replacing wildcard', async () => {
    const imageUrl = 'gcr.io/$PROJECTID/image-name:image-tag';
    runOptions.imageUrl = imageUrl;

    await deployGae.deployGae(runOptions);

    const expectedImageUrl = 'gcr.io/project-id/image-name:image-tag';
    deployToolMock.verify(
        t => t.argIf(expectedImageUrl, `--image-url="${expectedImageUrl}"`),
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
