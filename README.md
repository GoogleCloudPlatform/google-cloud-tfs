[![Build status](https://ci.appveyor.com/api/projects/status/hu7qlgxrh2j0i35y/branch/master?svg=true)](https://ci.appveyor.com/project/ILMTitan/google-cloud-tfs/branch/master)
[![codecov](https://codecov.io/gh/GoogleCloudPlatform/google-cloud-tfs/branch/master/graph/badge.svg)](https://codecov.io/gh/GoogleCloudPlatform/google-cloud-tfs)

# ![GCPLogo][GCPLogo] Cloud Tools for Team Foundation Server

This repository contains an extension for Team Foundation server and Visual
Studio Team Services. The extension provides a new service endpoint and several
build tasks for interacting with Google Cloud Platform.

## Documentation

For Documentation on using the extension, see [DETAILS.md](DETAILS.md)

## Installation

The latest stable version can be found on the
[Visual Studio Marketplace][Marketplace] or in the [GitHub Releases][GitHubReleases]

The latest development version is available from [AppVeyor][Appveyor].

You can [build the vsix package from source](#Build), and then upload and
install the extension from the extension management page of TFS.

## Build

### Prerequisits

  - [PowerShell][PowerShell]. Installed by default on modern windows platforms.
  - [Node.js][Node]. Download and install from the website.
  - [npm][npm]. Should be installed with the Node.js install.
  - [TypeScript][TypeScript]. Install with `npm install -g typescript`
  - [tfx][tfs-cli] The tfs cli. Install with `npm install -g tfx-cli`

### Build Script

Execute build script `./build/BuildExtension.ps1`. It will download needed
modules, build the common files and build tasks, and then package everything
into `./bin/Google Cloud Tools.google-cloud-tfs-<version>.vsix`.

## Contributing

 See our [Contributing guide](CONTRIBUTING.md)

## Support

Issues are tracked on [GitHub][GitHubIssues].
Questions can be asked on StackOverflow
  - [Ask a question][StackOverflowAsk]
  - [Browse asked questions][StackOverflowBrowse]

[GCPLogo]: images/cloud_64x64.png
[PowerShell]: https://msdn.microsoft.com/powershell
[Node]: https://nodejs.org
[npm]: https://www.npmjs.com
[TypeScript]: https://www.typescriptlang.org
[tfs-cli]: https://github.com/Microsoft/tfs-cli
[CloudSdk]: https://cloud.google.com/sdk/downloads

[GitHubIssues]: https://github.com/GoogleCloudPlatform/google-cloud-tfs/issues
[GitHubReleases]: https://github.com/GoogleCloudPlatform/google-cloud-tfs/releases

[Marketplace]: https://marketplace.visualstudio.com/items?itemName=GoogleCloudTools.google-cloud-tfs

[Appveyor]: https://ci.appveyor.com/project/ILMTitan/google-cloud-tfs/build/artifacts

[StackOverflowAsk]: http://stackoverflow.com/questions/ask?tags=google-cloud-tfs
[StackOverflowBrowse]: http://stackoverflow.com/questions/tagged/google-cloud-tfs
