# ![GCP][GCPLogo] Gcloud Command Line Build Task

Execute an arbitrary [gcloud][gcloud] command.

## Usage

This task allow you to execute any gcloud command, giving access to any functionalty missing from the more specialized
build tasks.

## Parameters

![Gcloud Command Line Build Task Inputs][gcloud-inputs]

 - GCP connection:
   The service endpoint defining the GCP project and service account for gcloud to authenticate against.
 - Command Line: The [gcloud command][gcloud] to run and its arguments.
 - Add project parameter: Include the `--project=<project-id>` parameter in the command line,
   taking the project id from the GCP connection. Leave unchecked to supply your own `--project` parameter in the
   Command Line.
 - Ignore Return Code: Check this to allow the task to succeed even if gcloud reports a failure.
 - StdOut build variable: The name of a build variable in which the output from gcloud is saved.
   `--format json` is recommended, as new lines are removed.

 [GCPLogo]: ../images/cloud_64x64.png
 [gcloud-inputs]: ../images/screenshots/gcloud-inputs.png

 [gcloud]: https://cloud.google.com/sdk/gcloud/reference/
