# Ntsamaela Website

Landing page website for ntsamaela.com hosted on AWS S3 + CloudFront.

## Structure

```
apps/website/
├── index.html          # Main landing page
├── styles.css          # All styles
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Features

- Modern, responsive design
- Botswana flag color scheme
- Smooth scrolling navigation
- Feature highlights
- Download app section
- Contact information
- SEO optimized

## Deployment to AWS

### Prerequisites

1. AWS Account
2. Domain registered (ntsamaela.com)
3. AWS CLI configured

### Steps

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://ntsamaela-website --region af-south-1
   ```

2. **Enable Static Website Hosting**
   ```bash
   aws s3 website s3://ntsamaela-website \
     --index-document index.html \
     --error-document index.html
   ```

3. **Upload Files**
   ```bash
   aws s3 sync . s3://ntsamaela-website --exclude "*.md"
   ```

4. **Set Bucket Policy** (for public read access)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::ntsamaela-website/*"
       }
     ]
   }
   ```

5. **Create CloudFront Distribution**
   - Origin: S3 bucket
   - Default root object: index.html
   - SSL certificate: Request or use ACM certificate
   - Custom domain: ntsamaela.com

6. **Configure DNS**
   - Add CNAME record pointing to CloudFront distribution
   - Or use Route 53 alias record

## Local Development

Simply open `index.html` in a browser or use a local server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## Customization

- Update contact information in `index.html`
- Modify colors in `styles.css` (CSS variables)
- Add/remove features as needed
- Update download links when apps are published

## Maintenance

- Keep content updated
- Monitor CloudFront logs
- Update SSL certificate before expiration
- Review and update contact information

