The CNI manfiest used has divergence between the
[upstream CNI](https://github.com/aws/amazon-vpc-cni-k8s/blob/v1.16.0/config/master/aws-k8s-cni.yaml),
Pulumi's [approach](https://github.com/pulumi/pulumi-eks/blob/master/nodejs/eks/cni/aws-k8s-cni.yaml),
and what AWS does by [default](https://github.com/aws/amazon-vpc-cni-k8s/issues/755) for Fargate clusters.

Pulumi's fork of the manifest removes certain lines from the upstream manifest. This is showcased in our forked copy by commenting out such lines.
