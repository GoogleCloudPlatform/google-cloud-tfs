# ![GCP][GCPLogo] Install Cloud Sdk Build Task

This task finds or installs the [Google Cloud SDK][CloudSdk].
It can then do some basic configuration.

## Usage

If the Google Cloud SDK is already installed for all users on the build agent,
this task is unnecessary. If, however, the Google Cloud SDK is installed for
the build agent user only, or not installed at all, you can use this task to find
or install it. Use this task before calling any other tasks that require the Google
Cloud SDK.
