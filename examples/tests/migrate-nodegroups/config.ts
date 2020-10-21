import * as pulumi from "@pulumi/pulumi";

interface Config {
    createNodeGroup2xlarge: pulumi.Input<boolean>;
    desiredCapacity2xlarge: pulumi.Input<number>;

    createNodeGroup4xlarge: pulumi.Input<boolean>;
    desiredCapacity4xlarge: pulumi.Input<number>;

    deployWorkload: pulumi.Input<boolean>;
    nginxNodeSelectorTermValues: pulumi.Input<string>[];
}

// Create the default 2xlarge node gruop and workload.
export const config: Config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 3,
    createNodeGroup4xlarge: false,
    desiredCapacity4xlarge: 0,
    deployWorkload: true,
    nginxNodeSelectorTermValues: ["t3.2xlarge"],
};
