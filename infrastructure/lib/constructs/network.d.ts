import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface NetworkProps {
    cidr?: string;
    maxAzs?: number;
}
export declare class Network extends Construct {
    readonly vpc: ec2.Vpc;
    readonly publicSubnets: ec2.ISubnet[];
    readonly privateSubnets: ec2.ISubnet[];
    constructor(scope: Construct, id: string, props?: NetworkProps);
}
