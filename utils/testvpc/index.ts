import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";

class Provider implements pulumi.provider.Provider {
    public readonly version = "0.0.1";

    construct(name: string, type: string, inputs: pulumi.Inputs,
              options: pulumi.ComponentResourceOptions): Promise<pulumi.provider.ConstructResult> {
        if (type != "testvpc:index:Vpc") {
            throw new Error(`unknown resource type ${type}`);
        }

        const vpc = new awsx.ec2.Vpc(name, inputs, options);
        return Promise.resolve({
            urn: vpc.urn,
            state: {
                vpcId: vpc.id,
                publicSubnetIds: vpc.publicSubnetIds,
                privateSubnetIds: vpc.privateSubnetIds
            },
        });
    }
}

export function main(args: string[]) {
    return pulumi.provider.main(new Provider(), args);
}

main(process.argv.slice(2));
