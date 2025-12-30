# Ntsamaela Website Deployment Guide

Complete guide to deploy ntsamaela.co.bw website on AWS.

## Prerequisites

1. **Domain Registration**
   - Register `ntsamaela.co.bw` domain
   - Options: AWS Route 53, Namecheap, GoDaddy, etc.
   - Cost: ~$15-30/year for .co.bw domain

2. **AWS Account Setup**
   - AWS account with billing enabled
   - AWS CLI installed and configured
   - Terraform installed (for infrastructure as code)

3. **Required AWS Services**
   - S3 (for hosting)
   - CloudFront (for CDN)
   - Route 53 (for DNS)
   - ACM (for SSL certificate)

## Step 1: Register Domain

### Option A: AWS Route 53 (Recommended)

1. Go to Route 53 → Registered domains
2. Click "Register domain"
3. Search for "ntsamaela.co.bw"
4. Complete registration (may take 1-3 days for .co.bw)
5. Cost: ~$20-30/year

### Option B: External Registrar

1. Register at your preferred registrar
2. You'll need to update nameservers later

## Step 2: Deploy Infrastructure

### Using Terraform

1. **Navigate to infrastructure directory**
   ```bash
   cd infrastructure/aws
   ```

2. **Update variables**
   Edit `variables.tf` or create `terraform.tfvars`:
   ```hcl
   domain_name = "ntsamaela.co.bw"
   environment = "production"
   project_name = "ntsamaela"
   create_route53_zone = true  # Set to false if using external DNS
   ```

3. **Initialize Terraform**
   ```bash
   terraform init
   ```

4. **Plan deployment**
   ```bash
   terraform plan
   ```

5. **Apply infrastructure**
   ```bash
   terraform apply
   ```

6. **Note outputs**
   - S3 bucket name
   - CloudFront distribution ID
   - Route 53 hosted zone ID (if created)

### Manual AWS Console Setup

If not using Terraform:

1. **Create S3 Bucket**
   - Name: `ntsamaela-website-production`
   - Region: `af-south-1` (Cape Town)
   - Enable static website hosting
   - Set index document: `index.html`
   - Set error document: `index.html`

2. **Set Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::ntsamaela-website-production/*"
       }
     ]
   }
   ```

3. **Request ACM Certificate**
   - Go to ACM → Request certificate
   - Domain: `ntsamaela.co.bw`
   - Add SAN: `www.ntsamaela.co.bw`
   - Validation: DNS
   - Region: `us-east-1` (required for CloudFront)

4. **Validate Certificate**
   - Add CNAME records to DNS
   - Wait for validation (usually 5-30 minutes)

5. **Create CloudFront Distribution**
   - Origin: S3 bucket website endpoint
   - Default root object: `index.html`
   - SSL certificate: Select ACM certificate
   - Alternate domain names: `ntsamaela.co.bw`, `www.ntsamaela.co.bw`
   - Default cache behavior: Redirect HTTP to HTTPS
   - Custom error responses:
     - 404 → 200 → `/index.html`
     - 403 → 200 → `/index.html`

## Step 3: Upload Website Files

### Using AWS CLI

1. **Navigate to website directory**
   ```bash
   cd apps/website
   ```

2. **Upload files**
   ```bash
   aws s3 sync . s3://ntsamaela-website-production \
     --exclude "*.md" \
     --exclude ".git/*" \
     --exclude "node_modules/*"
   ```

3. **Set content types**
   ```bash
   aws s3 cp index.html s3://ntsamaela-website-production/ \
     --content-type "text/html" \
     --cache-control "max-age=3600"
   
   aws s3 cp styles.css s3://ntsamaela-website-production/ \
     --content-type "text/css" \
     --cache-control "max-age=31536000"
   
   aws s3 cp script.js s3://ntsamaela-website-production/ \
     --content-type "application/javascript" \
     --cache-control "max-age=31536000"
   ```

### Using AWS Console

1. Go to S3 → Your bucket
2. Click "Upload"
3. Select all files (index.html, styles.css, script.js)
4. Set metadata:
   - index.html: Content-Type = `text/html`
   - styles.css: Content-Type = `text/css`
   - script.js: Content-Type = `application/javascript`
5. Upload

## Step 4: Configure DNS

### If Using Route 53

1. Go to Route 53 → Hosted zones
2. Select your domain
3. Create A record:
   - Name: (leave blank for root domain)
   - Type: A - IPv4 address
   - Alias: Yes
   - Alias target: CloudFront distribution
   - Record name: Your CloudFront domain

4. Create A record for www:
   - Name: www
   - Type: A - IPv4 address
   - Alias: Yes
   - Alias target: CloudFront distribution

### If Using External DNS

1. Get CloudFront distribution domain name
2. Add CNAME records:
   - `ntsamaela.co.bw` → `d1234abcd.cloudfront.net`
   - `www.ntsamaela.co.bw` → `d1234abcd.cloudfront.net`

   OR

3. Add A records (if supported):
   - Use CloudFront distribution IPs (not recommended, use CNAME)

## Step 5: Wait for Propagation

- DNS propagation: 5 minutes to 48 hours (usually 1-2 hours)
- CloudFront deployment: 15-30 minutes
- SSL certificate validation: 5-30 minutes

## Step 6: Verify Deployment

1. **Check website**
   - Visit `https://ntsamaela.co.bw`
   - Visit `https://www.ntsamaela.co.bw`
   - Both should redirect to HTTPS

2. **Test features**
   - Navigation links
   - Download buttons
   - Contact information
   - Mobile responsiveness

3. **Check SSL**
   - Verify SSL certificate is valid
   - Check browser security indicators

## Step 7: Configure Email Domain (for SES)

Now that you have the domain, set it up for AWS SES:

1. **Go to SES Console**
2. **Create domain identity**
   - Domain: `ntsamaela.co.bw`
   - MAIL FROM domain: `mail.ntsamaela.co.bw`

3. **Add DNS records**
   - Add verification CNAME records
   - Add MAIL FROM MX and SPF records

4. **Update .env file**
   ```env
   EMAIL_PROVIDER="ses"
   EMAIL_FROM="noreply@ntsamaela.co.bw"
   EMAIL_FROM_NAME="Ntsamaela"
   FRONTEND_URL="https://ntsamaela.co.bw"
   ```

## Maintenance

### Updating Website

1. Make changes to files
2. Upload to S3:
   ```bash
   aws s3 sync . s3://ntsamaela-website-production \
     --exclude "*.md" \
     --exclude ".git/*"
   ```
3. Invalidate CloudFront cache:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id YOUR_DISTRIBUTION_ID \
     --paths "/*"
   ```

### Monitoring

- CloudWatch: Monitor CloudFront metrics
- S3: Check bucket access logs
- Route 53: Monitor DNS queries

### Costs

- S3: ~$0.023/GB storage + $0.005/1000 requests
- CloudFront: ~$0.085/GB data transfer (first 10TB)
- Route 53: $0.50/hosted zone/month
- **Total: ~$1-5/month** (for low traffic)

## Troubleshooting

### Website not loading
- Check S3 bucket policy (public read access)
- Verify CloudFront distribution is deployed
- Check DNS records are correct
- Wait for DNS propagation

### SSL certificate issues
- Ensure certificate is in `us-east-1` region
- Verify DNS validation records are added
- Check certificate status in ACM

### 404 errors
- Verify `index.html` is uploaded
- Check CloudFront error page configuration
- Ensure default root object is set

## Support

For issues or questions:
- Check AWS CloudWatch logs
- Review CloudFront access logs
- Contact AWS support if needed

