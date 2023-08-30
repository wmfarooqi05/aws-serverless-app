# Global Employment Infrastructure Notes
These are the resources which we are mainly using and they need to be setup by Terraform instead of Serverless

### Lambda Layers
  - We can check, if we can write a bash or TF script, which runs npm install in all three folders one by one and then zip it, and upload it to S3 Bucket
  - Then we can add lambda layer version

### RDS Postgres Instance (better to try aurora postgres)
  - Inside private subnets

### RDS Proxy (Private Subnets)
### VPC
### Subnets (Private and Public)
### IGW (Public Subnets)
### Route Tables
### NAT Gateway (For private subnets)
  - Required for Websockets
  - Required if our DB is in private subnets
### Security Groups
  - For now, we will allow all inbound traffic
  - Remember to copy settings for VPC carefully
  - We are not using VPC to VPC peer connection right now
### EC2 Instance
  - It will act as bastion host for accessing DB via EC2
### Secret Manager
  - CDN secret
  - Database secret (maybe will be replaced with IAM Auth)
### SQS
  - Email Queue and DLQ
  - Jobs Queue and DLQ
  - Image Queue and DLQ
### SNS
  - incoming-mail-east-1-topic in us-east-1
  - its access policy
  - subscribe it to sqs in ca-central-1
### S3 Bucket
  - ca-central-1
  - us-east-1 for emails
  - access policies on both buckets (very important)
  - later on, we can add policy on both buckets, like data in `tmp` can be removed after 3 days, or emails which has been delivered can be removed from bucket
### CDN
  - Setup on ca-central-1
  - Add media/* as public static
  - Its secret will be in secret manager

### Route53
  - Better to handle domain configurations here
  - Also, need to integrate it with SES domain (DKIM Records)

### SES
  - Add verified identities
  - When our SES will move to prod, we don't need to add email identities, all emails with `@domain` will work
  - For receiving emails, we need to setup ses receipt rule in `us-east-1`, because `ca-central-1` doesn't support it.
    - We need to add a receipt rule, which will store our mail to us-east-1 bucket.
    - On bucket, we will add trigger, which will put the mail as a message in ca-central-1 email sqs. This sqs will trigger lambda
  - Check if we are using smtp settings (probably not)

### Cognito
  - Add a user pool
  - Configure a domain with it to handle Hosted UI (right now its default domain provided by aws)
  - Add an App Client
  - Add `Allowed callback URLs` in app client Hosted UI
### Google OAuth Integration
  - We need to create a .tf script for Google OAuth Handling
  - We need to create a google project
  - Then create a oauth token which will allows emails of `@nastaffing.com` to get tokens for calendar and meeting
  - In Google workspace settings, where they are forwarding emails from Google workspace to outlook, we have to add another rule to send to Amazon SES `us-east-1` as well 

### IAM
  - This one is the trickiest part. For now, we are allowing everything
  to a single user.
  - We need to create different roles for different services, like RDS proxy should have a role which only has setting of `rds:AssumeRole`.
  - Similarly, Lambda should have limited access. 
  - Copy the trust entity relationship settings carefully
  - Right now, these are the major operations which are lambda doing with Read/Write
    - Event Bridge Scheduler
      - Carefully check `AmazonEventBridgeSchedulerFullAccess` role
      - We are also adding an `Assume` role in trust relationship
      - `iam:PassRole` is also being added
    - SQS (in resource pass an array of all 3 queues ARNs)
    - S3 Bucket
      - We can check if we can only give write / update access (PUT Object)
      - Delete access can be given only to SQS-Lambda, which has deleteSQSFiles job
    - SNS (not sure)
    - Secret Manager (getting secret)
    - Maybe some services in websocket
    - Amazon SES 
      - Send email
      - Bulk Email sending
      - Email Templates
      - Suppression List
    - EC2 (most probably not, due to `AWSLambdaVPCAccessExecutionRole`)
    - Cognito
      - We will need access maybe, when we will add auth on every endpoint
    - AWSLambdaVPCAccessExecutionRole
      - this will be auto provided by sls, it will add cloudwatch and necessary ec2 network permissions
    - Lambda
      - maybe invoke permission
      - Layers read/write/update permission
    
