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
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as Q from 'q';
import {IMock, It, Mock, Times} from 'typemoq';
import * as task from 'vsts-task-lib/task';
import * as toolRunner from 'vsts-task-lib/toolrunner';
import * as toolLib from 'vsts-task-tool-lib/tool';

import {CloudSdkPackage} from '../cloud-sdk-package';

function setupHttpGet(httpMock: IMock<typeof http>,
                      messageChunks: string[]): void;
function setupHttpGet(httpMock: IMock<typeof http>, clientError: Error): void;
function setupHttpGet(httpMock: IMock<typeof http>,
                      output: string[]|Error): void {
  const messageMock = Mock.ofType<http.IncomingMessage>();
  const clientRequestMock = Mock.ofType<http.ClientRequest>();
  // see https://github.com/florinn/typemoq/issues/66
  /* tslint:disable next line no-any */
  messageMock.setup((m: any) => m.then).returns(() => undefined);
  messageMock.setup(m => m.on('end', It.isAny()))
      .callback((_, cb) => cb())
      .returns(() => messageMock.object);
  const getSetup = httpMock.setup(http => http.get(It.isAny(), It.isAny()));
  getSetup.returns(() => clientRequestMock.object);

  if (output instanceof Array) {
    getSetup.callback((_, resolve: (res: http.IncomingMessage) => void) =>
                          resolve(messageMock.object));
    messageMock.setup(m => m.on('data', It.isAny()))
        .callback((_, cb: (chunk: string) => void) => output.forEach(cb))
        .returns(() => messageMock.object);
  } else {
    clientRequestMock.setup(c => c.on('error', It.isAny()))
        .callback((_, reject: (err: Error) => void) => reject(output));
  }
}

describe('unit tests', () => {
  // Mocks used in every test.
  let taskMock: IMock<typeof task>;
  let toolLibMock: IMock<typeof toolLib>;
  let httpMock: IMock<typeof http>;
  let osMock: IMock<typeof os>;

  beforeEach('setup di mocks', () => {
    taskMock = Mock.ofInstance(task);
    taskMock.callBase = true;

    toolLibMock = Mock.ofInstance(toolLib);
    toolLibMock.callBase = true;

    httpMock = Mock.ofInstance(http);

    osMock = Mock.ofInstance(os);
    osMock.callBase = true;
  });

  describe('#queryLatestVersion()', () => {
    it('should return queried version', async () => {
      const mockVersion = 'mockVersion';
      setupHttpGet(httpMock, [ `{"version":"${mockVersion}"}` ]);
      const version =
          await CloudSdkPackage.queryLatestVersion({http : httpMock.object});

      assert.equal(version, mockVersion);
    });

    it('should return queried version in many chunks', async () => {
      const mockVersion = 'mockVersion';
      setupHttpGet(httpMock, [ '{', `    "version": "${mockVersion}"`, '}' ]);
      const version =
          await CloudSdkPackage.queryLatestVersion({http : httpMock.object});

      assert.equal(version, mockVersion);
    });

    it('should fail on invalid JSON', async () => {
      setupHttpGet(httpMock, [ 'this is not JSON' ]);
      try {
        await CloudSdkPackage.queryLatestVersion({http : httpMock.object});
      } catch (e) {
        return;
      }
      assert.fail('', '');
    });

    it('should throw on client request error', async () => {
      const mockError = new Error('mock error');
      setupHttpGet(httpMock, mockError);

      try {
        await CloudSdkPackage.queryLatestVersion({http : httpMock.object});
      } catch (e) {
        if (e === mockError) {
          return;
        } else {
          throw e;
        }
      }
      assert.fail('', '');
    });
  });

  describe('constructor', () => {
    it('should set values', () => {
      const mockPath = 'mockPath';
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => mockPath);

      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.equal(sdkPackage.version, mockVersion);
      assert.equal(sdkPackage.getToolPath(), mockPath);
    });

    it('should clean version', () => {
      const mockPath = 'mockPath';
      const mockVersion = '1.0.0-mockVersion';
      const dirtyMockVersion = `\n\t v=${mockVersion} \f\r`;
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => mockPath);

      const sdkPackage =
          new CloudSdkPackage(dirtyMockVersion, {toolLib : toolLibMock.object});

      assert.equal(sdkPackage.version, mockVersion);
    });

    it('should accept uncached', () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);

      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.equal(sdkPackage.getToolPath(), null);
    });

    it('should throw on invalid version', () => {
      const mockPath = 'mockPath';
      const invalidVersion = 'invalidVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => mockPath);

      assert.throws(() => {
        const sdkPackage =
            new CloudSdkPackage(invalidVersion, {toolLib : toolLibMock.object});
        assert.fail(sdkPackage, null);
      });
    });
  });

  describe('#createPackage(versionSpec?: string)', () => {
    let di: {http: typeof http, toolLib: typeof toolLib, task: typeof task};

    beforeEach('init dependency injection object', () => {
      di = {
        http : httpMock.object,
        toolLib : toolLibMock.object,
        task : taskMock.object,
      };
    });

    it('should query latest with null version spec', async () => {
      const mockVersion = '1.0.0-mockVersion';
      setupHttpGet(httpMock, [ `{"version":"${mockVersion}"}` ]);
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);

      const sdkPackage = await CloudSdkPackage.createPackage(null, di);

      assert.equal(sdkPackage.version, mockVersion);
    });

    it('should query latest with empty version spec', async () => {
      const mockVersion = '1.0.0-mockVersion';
      setupHttpGet(httpMock, [ `{"version":"${mockVersion}"}` ]);
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);

      const sdkPackage = await CloudSdkPackage.createPackage('', di);

      assert.equal(sdkPackage.version, mockVersion);
    });

    it('should accept exact version spec', async () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);

      const sdkPackage = await CloudSdkPackage.createPackage(mockVersion, di);

      assert.equal(sdkPackage.version, mockVersion);
    });

    it('should throw on invalid version spec', async () => {
      try {
        await CloudSdkPackage.createPackage('invalidVersion', di);
      } catch (e) {
        return;
      }

      assert.fail('', '');
    });
  });

  describe('#isCached', () => {
    it('should return false for null tool path', () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);
      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.ok(!sdkPackage.isCached());
    });

    it('should return false for empty tool path', () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => '');
      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.ok(!sdkPackage.isCached());
    });

    it('should return false for undefined tool path', () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => undefined);
      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.ok(!sdkPackage.isCached());
    });

    it('should return true for actual tool path', () => {
      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => 'a:/tool/path');
      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.ok(sdkPackage.isCached());
    });
  });

  describe('#getToolPath()', () => {
    it('should get tool path', () => {
      const mockVersion = '1.0.0-mockVersion';
      const mockToolPath = 'a:/tool/path';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => mockToolPath);
      const sdkPackage =
          new CloudSdkPackage(mockVersion, {toolLib : toolLibMock.object});

      assert.equal(sdkPackage.getToolPath(), mockToolPath);
    });
  });

  describe('#initalizeOrAquire(allowReporting: boolean)', () => {
    const mockGcloudPath = 'a:/gcloud/path';
    const mockVersion = '1.0.0-mockVersion';
    const mockToolPath = 'a:/tool/path';
    let toolRunnerMock: IMock<toolRunner.ToolRunner>;
    let di: {toolLib: typeof toolLib, task: typeof task, os: typeof os};

    beforeEach('init dependency injection objects and mocks', () => {
      di = {
        toolLib : toolLibMock.object,
        task : taskMock.object,
        os : osMock.object,
      };

      osMock.setup(os => os.platform()).returns(() => 'win32');
      osMock.setup(os => os.arch()).returns(() => 'x86');

      toolLibMock.setup(toolLib => toolLib.prependPath(It.isAny()))
          .returns(() => null);
      toolLibMock.setup(tl => tl.downloadTool(It.isAny()))
          .returns(() => Promise.resolve('a:/archive/file.zip'));
      toolLibMock
          .setup(
              tl => tl.cacheDir(It.isAny(), It.isAny(), It.isAny(), It.isAny()))
          .returns(() => Promise.resolve(mockToolPath));
      toolLibMock.setup(tl => tl.extractZip(It.isAny()))
          .returns(() => Promise.resolve('a:/archive/folder'));

      toolRunnerMock = Mock.ofType<toolRunner.ToolRunner>();
      toolRunnerMock.setup(tr => tr.line(It.isAny()))
          .returns(() => toolRunnerMock.object);
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.resolve(0));

      taskMock.setup(task => task.which('gcloud'))
          .returns(() => mockGcloudPath);
      taskMock.setup(task => task.tool(It.isAny()))
          .returns(() => toolRunnerMock.object);
    });

    it('should init cached version', async () => {
      toolLibMock
          .setup(tl => tl.findLocalTool(It.isAny(), It.isAny(), It.isAny()))
          .returns(() => mockToolPath);
      const objectUnderTest = new CloudSdkPackage(mockVersion, di);

      await objectUnderTest.initializeOrAcquire(true, di);

      taskMock.verify(t => t.tool(mockGcloudPath), Times.once());
    });

    it('should aquire new version', async () => {
      toolLibMock
          .setup(tl => tl.findLocalTool(It.isAny(), It.isAny(), It.isAny()))
          .returns(() => null);
      const objectUnderTest = new CloudSdkPackage(mockVersion, di);

      await objectUnderTest.initializeOrAcquire(true, di);
      
      taskMock.verify(t => t.tool(It.is<string>(s => s !== mockGcloudPath)),
                      Times.once());
    });
  });

  describe('#initalize(allowReporting: boolean)', () => {
    const mockToolPath = 'a:/tool/path';
    let toolRunnerMock: IMock<toolRunner.ToolRunner>;
    let di: {toolLib: typeof toolLib, task: typeof task};
    let sdkPackage: CloudSdkPackage;

    beforeEach('init dependency injection object and mocks', () => {
      di = {toolLib : toolLibMock.object, task : taskMock.object};

      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => mockToolPath);
      toolLibMock.setup(toolLib => toolLib.prependPath(It.isAny()))
          .returns(() => null);
      toolRunnerMock = Mock.ofType<toolRunner.ToolRunner>();
      toolRunnerMock.setup(tr => tr.line(It.isAny()))
          .returns(() => toolRunnerMock.object);
      const mockGcloudPath = 'a:/gcloud/path';
      taskMock.setup(task => task.which('gcloud'))
          .returns(() => mockGcloudPath);
      taskMock.setup(task => task.tool(mockGcloudPath))
          .returns(() => toolRunnerMock.object);
      sdkPackage = new CloudSdkPackage(mockVersion, di);
    });

    it('should prepend path', async () => {
      const toolPathToPrepend =
          path.join(mockToolPath, 'google-cloud-sdk', 'bin');
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.resolve(0));

      await sdkPackage.initialize(false, di);

      toolLibMock.verify(toolLib => toolLib.prependPath(toolPathToPrepend),
                         Times.once());
    });

    it('should disable usage reporting', async () => {
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.resolve(0));

      await sdkPackage.initialize(false, di);

      toolRunnerMock.verify(tr => tr.exec(It.isAny()), Times.once());
      toolRunnerMock.verify(
          tr => tr.line('config set disable_usage_reporting true'),
          Times.once());
    });

    it('should enable usage reporting', async () => {
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.resolve(0));

      await sdkPackage.initialize(true, di);

      toolRunnerMock.verify(tr => tr.exec(It.isAny()), Times.once());
      toolRunnerMock.verify(
          tr => tr.line('config set disable_usage_reporting false'),
          Times.once());
    });

    it('should throw on tool runner error', async () => {
      const error = new Error('Mock Tool Runner Error');
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.reject<number>(error));

      try {
        await sdkPackage.initialize(true, di);
      } catch (e) {
        if (e === error) {
          return;
        } else {
          throw e;
        }
      }
      assert.fail('', '');
    });
  });

  describe('#aquire(allowReporting: boolean)', () => {
    const mockDownloadPath = 'a:/download/path';
    const mockExtractPath = 'a:/extract/path';
    const mockToolPath = 'a:/tool/path';
    let toolRunnerMock: IMock<toolRunner.ToolRunner>;
    let di: {toolLib: typeof toolLib, task: typeof task, os: typeof os};
    let sdkPackage: CloudSdkPackage;

    beforeEach('init dependency injection object and mocks', () => {
      di = {
        toolLib : toolLibMock.object,
        task : taskMock.object,
        os : osMock.object,
      };

      const mockVersion = '1.0.0-mockVersion';
      toolLibMock
          .setup(toolLib => toolLib.findLocalTool(It.isAny(), It.isAny()))
          .returns(() => null);
      toolLibMock.setup(toolLib => toolLib.prependPath(It.isAny()))
          .returns(() => null);
      toolLibMock.setup(toolLib => toolLib.downloadTool(It.isAny()))
          .returns(() => Promise.resolve(mockDownloadPath));
      toolLibMock.setup(toolLib => toolLib.extractZip(It.isAny()))
          .returns(() => Promise.resolve(mockExtractPath));
      toolLibMock.setup(toolLib => toolLib.extractTar(It.isAny()))
          .returns(() => Promise.resolve(mockExtractPath));
      toolLibMock
          .setup(toolLib => toolLib.cacheDir(It.isAny(), It.isAny(), It.isAny(),
                                             It.isAny()))
          .returns(() => Promise.resolve(mockToolPath));
      toolRunnerMock = Mock.ofType<toolRunner.ToolRunner>();
      toolRunnerMock.setup(tr => tr.line(It.isAny()))
          .returns(() => toolRunnerMock.object);
      toolRunnerMock.setup(tr => tr.exec(It.isAny()))
          .returns(() => Q.resolve(0));
      taskMock.setup(task => task.tool(It.isAny()))
          .returns(() => toolRunnerMock.object);
      sdkPackage = new CloudSdkPackage(mockVersion, di);
    });

    it('aquires from a 64 bit windows environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'win32');
      osMock.setup(os => os.arch()).returns(() => 'x64');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(
          toolLib => toolLib.downloadTool(It.is(
              (s: string) => s.endsWith('windows-x86_64-bundled-python.zip'))),
          Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.never());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.bat'))),
          Times.once());
    });

    it('aquires from a 32 bit windows environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'win32');
      osMock.setup(os => os.arch()).returns(() => 'x86');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(
          toolLib => toolLib.downloadTool(It.is(
              (s: string) => s.endsWith('windows-x86-bundled-python.zip'))),
          Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.never());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.bat'))),
          Times.once());
    });

    it('aquires from a ia32 windows environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'win32');
      osMock.setup(os => os.arch()).returns(() => 'ia32');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(
          toolLib => toolLib.downloadTool(It.is(
              (s: string) => s.endsWith('windows-x86-bundled-python.zip'))),
          Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.never());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.bat'))),
          Times.once());
    });

    it('aquires from a 64 bit mac environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'darwin');
      osMock.setup(os => os.arch()).returns(() => 'x64');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(
          toolLib => toolLib.downloadTool(
              It.is((s: string) => s.endsWith('darwin-x86_64.tar.gz'))),
          Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.never());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.once());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.sh'))),
          Times.once());
    });

    it('aquires from a 32 bit mac environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'darwin');
      osMock.setup(os => os.arch()).returns(() => 'x86');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(toolLib => toolLib.downloadTool(It.is(
                             (s: string) => s.endsWith('darwin-x86.tar.gz'))),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.never());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.once());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.sh'))),
          Times.once());
    });

    it('aquires from a 64 bit linux environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'linux');
      osMock.setup(os => os.arch()).returns(() => 'x64');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(toolLib => toolLib.downloadTool(It.is(
                             (s: string) => s.endsWith('linux-x86_64.tar.gz'))),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.never());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.once());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.sh'))),
          Times.once());
    });

    it('aquires from a 32 bit linux environment correctly', async () => {
      osMock.setup(os => os.platform()).returns(() => 'linux');
      osMock.setup(os => os.arch()).returns(() => 'x86');

      await sdkPackage.acquire(true, di);

      toolLibMock.verify(toolLib => toolLib.downloadTool(It.is(
                             (s: string) => s.endsWith('linux-x86.tar.gz'))),
                         Times.once());
      toolLibMock.verify(toolLib => toolLib.extractZip(It.isAny()),
                         Times.never());
      toolLibMock.verify(toolLib => toolLib.extractTar(It.isAny()),
                         Times.once());
      taskMock.verify(
          task => task.tool(It.is((s: string) => s.endsWith('install.sh'))),
          Times.once());
    });

    it('fails for an usupported os', async () => {
      osMock.setup(os => os.platform()).returns(() => 'android');

      await sdkPackage.acquire(true, di).then(
          () => assert.fail(
              undefined, new Error('Unsupported operating system: android.')),
          (e: Error) => assert.equal(e.message,
                                     'Unsupported operating system: android.'));
    });

    it('fails for an usupported architecture', async () => {
      osMock.setup(os => os.platform()).returns(() => 'linux');
      osMock.setup(os => os.arch()).returns(() => 'unknownArch');

      await sdkPackage.acquire(true, di).then(
          () => assert.fail(
              undefined, new Error('Unsupported architecture: unknownArch.')),
          (e: Error) => assert.equal(e.message,
                                     'Unsupported architecture: unknownArch.'));
    });
  });
});
