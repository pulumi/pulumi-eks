import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

// Create an EKS cluster with a single storage class as a string.
const cluster1 = new eks.Cluster(`${projectName}-1`, {
    deployDashboard: false,
    storageClasses: "io1",
});

if (cluster1.core.storageClasses) {
    // Use a single storage class.
    if ("io1" in cluster1.core.storageClasses) {
        cluster1.core.storageClasses["io1"].apply(sc => {
            sc.metadata.name.apply(n => {
                if (n) {
                    console.log(n);
                }
            });
        });
    }
}
export const kubeconfig1 = cluster1.kubeconfig;

// Create an EKS cluster with many storage classes as a map.
const cluster2 = new eks.Cluster(`${projectName}-2`, {
    deployDashboard: false,
    storageClasses: {
        "mygp2": {
            type: "gp2",
            default: true,
            encrypted: true,
        },
        "mysc1": {
            type: "sc1",
        },
    },
});

if (cluster2.core.storageClasses) {
    // Use many storage classes.
    if ("mygp2" in cluster2.core.storageClasses) {
        cluster2.core.storageClasses["mygp2"].apply(sc => {
            sc.metadata.name.apply(n => {
                if (n) {
                    console.log(n);
                }
            });
        });
    }
    if ("mysc1" in cluster2.core.storageClasses) {
        cluster2.core.storageClasses["mysc1"].apply(sc => {
            sc.metadata.name.apply(n => {
                if (n) {
                    console.log(n);
                }
            });
        });
    }
}
export const kubeconfig2 = cluster2.kubeconfig;
