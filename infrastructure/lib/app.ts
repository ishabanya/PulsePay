#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PaymentStack } from './payment-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'development';
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

if (!account) {
  throw new Error('CDK_DEFAULT_ACCOUNT environment variable is required');
}

const env = {
  account,
  region,
};

const stackName = `PaymentApp-${environment}`;

new PaymentStack(app, stackName, {
  env,
  environment,
  description: `Payment Processing Application - ${environment} environment`,
  tags: {
    Environment: environment,
    Project: 'PaymentApp',
    ManagedBy: 'CDK',
  },
});

app.synth();