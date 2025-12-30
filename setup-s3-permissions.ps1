# PowerShell script to set up S3 permissions for IAM user
# Make sure AWS CLI is configured with your credentials

Write-Host "Setting up S3 permissions for IAM user..." -ForegroundColor Green

# IAM user name (replace with your actual IAM user name)
$IAM_USER_NAME = "ntsamaela-app-user"

# Policy document
$policyDocument = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::ntsamaela-documents",
        "arn:aws:s3:::ntsamaela-documents/*",
        "arn:aws:s3:::ntsamaela-packages",
        "arn:aws:s3:::ntsamaela-packages/*",
        "arn:aws:s3:::ntsamaela-uploads",
        "arn:aws:s3:::ntsamaela-uploads/*"
      ]
    }
  ]
}
"@

# Save policy to temp file
$policyFile = "temp-s3-policy.json"
$policyDocument | Out-File -FilePath $policyFile -Encoding UTF8

Write-Host "`nCreating IAM policy..." -ForegroundColor Yellow
# Create the policy
aws iam create-policy `
  --policy-name NtsamaelaS3BucketAccess `
  --policy-document file://$policyFile `
  --description "Allows read/write access to Ntsamaela S3 buckets"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Policy created successfully!" -ForegroundColor Green
    
    # Get your AWS account ID
    $accountId = (aws sts get-caller-identity --query Account --output text)
    $policyArn = "arn:aws:iam::${accountId}:policy/NtsamaelaS3BucketAccess"
    
    Write-Host "`nAttaching policy to IAM user: $IAM_USER_NAME" -ForegroundColor Yellow
    # Attach policy to user
    aws iam attach-user-policy `
      --user-name $IAM_USER_NAME `
      --policy-arn $policyArn
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Policy attached successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error attaching policy. Make sure the IAM user name is correct." -ForegroundColor Red
    }
} else {
    Write-Host "Error creating policy. It may already exist." -ForegroundColor Red
    Write-Host "Trying to attach existing policy..." -ForegroundColor Yellow
    
    $accountId = (aws sts get-caller-identity --query Account --output text)
    $policyArn = "arn:aws:iam::${accountId}:policy/NtsamaelaS3BucketAccess"
    
    aws iam attach-user-policy `
      --user-name $IAM_USER_NAME `
      --policy-arn $policyArn
}

# Clean up
Remove-Item $policyFile -ErrorAction SilentlyContinue

Write-Host "`nDone! Your IAM user now has S3 read/write access." -ForegroundColor Green

