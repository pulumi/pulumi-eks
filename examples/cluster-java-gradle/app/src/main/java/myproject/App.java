package myproject;

import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.eks.Cluster;
import com.pulumi.eks.ClusterArgs;
import com.pulumi.awsx.ec2.Vpc;

public class App {
    public static void main(String[] args) {
        Pulumi.run(ctx -> {
            Cluster cluster1 = new Cluster("cluster1");

            Vpc vpc = new Vpc("vpc");

            Cluster cluster2 = new Cluster("cluster2", ClusterArgs.builder()
                .vpcId(vpc.vpcId())
                .publicSubnetIds(vpc.publicSubnetIds())
                .desiredCapacity(2)
                .instanceType("t3.medium")
                .minSize(2)
                .maxSize(2)
                .build());

            // Export the clusters' kubeconfig.
            Output<Object> kubeconfig1 = cluster1.kubeconfig();
            Output<Object> kubeconfig2 = cluster2.kubeconfig();

            ctx.export("kubeconfig1", kubeconfig1);
            ctx.export("kubeconfig2", kubeconfig2);
            ctx.export("exampleOutput", Output.of("example"));
        });
    }
}
