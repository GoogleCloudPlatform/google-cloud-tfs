# ![GCP][GCPLogo] KubeCtl Command Line Build Task

Execute an arbitrary [KubeCtl][kubectl] command.

## Usage

This task allow you to execute any kubectl command, giving access to any functionalty missing from the more specialized
build tasks.

## Parameters

![KubeCtl Command Line Build Task Inputs][kubectl-inputs]

 - GCP connection:
   The service endpoint defining the GCP project and service account for kubectl to authenticate against.
 - Command Line: The [kubectl command][kubectl] to run and its arguments.
 - Zone: The zone of the target cluster.
 - Cluster Name: The name of the target cluster.
 - Ignore Return Code: Check this to allow the task to succeed even if kubectl reports a failure.
 - StdOut build variable: The name of a build variable in which the output from kubectl is saved.
   `--output json` is recommended, as new lines are removed.

 [GCPLogo]: ../images/cloud_64x64.png
 [kubectl-inputs]: ../images/screenshots/kubectl-inputs.png
 [kubectl]: https://cloud.google.com/sdk/gcloud/reference/
