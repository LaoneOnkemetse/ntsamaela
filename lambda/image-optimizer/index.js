// Lambda@Edge function for image optimization
// This function optimizes images on-the-fly for better performance

const sharp = require('sharp');

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const response = event.Records[0].cf.response;
    
    // Only process image requests
    if (!request.uri.match(/\.(jpg|jpeg|png|webp)$/i)) {
        return response;
    }
    
    // Check if image needs optimization
    const acceptHeader = request.headers['accept'] ? request.headers['accept'][0].value : '';
    const userAgent = request.headers['user-agent'] ? request.headers['user-agent'][0].value : '';
    
    // Skip optimization for bots and crawlers
    if (userAgent.match(/bot|crawler|spider|scraper/i)) {
        return response;
    }
    
    try {
        // Get the image from S3
        const s3Response = await fetch(`https://${request.origin.s3.domainName}${request.uri}`);
        
        if (!s3Response.ok) {
            return response;
        }
        
        const imageBuffer = await s3Response.arrayBuffer();
        const buffer = Buffer.from(imageBuffer);
        
        // Determine optimal format and quality
        let outputFormat = 'jpeg';
        let quality = 85;
        
        if (acceptHeader.includes('image/webp')) {
            outputFormat = 'webp';
            quality = 80;
        } else if (acceptHeader.includes('image/avif')) {
            outputFormat = 'avif';
            quality = 75;
        }
        
        // Get image dimensions
        const metadata = await sharp(buffer).metadata();
        const { width, height } = metadata;
        
        // Determine optimal dimensions
        let targetWidth = width;
        let targetHeight = height;
        
        // Resize for mobile devices
        if (userAgent.match(/mobile|android|iphone|ipad/i)) {
            if (width > 800) {
                targetWidth = 800;
                targetHeight = Math.round((height * 800) / width);
            }
        } else if (width > 1200) {
            targetWidth = 1200;
            targetHeight = Math.round((height * 1200) / width);
        }
        
        // Optimize the image
        let optimizedBuffer;
        
        if (outputFormat === 'webp') {
            optimizedBuffer = await sharp(buffer)
                .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality })
                .toBuffer();
        } else if (outputFormat === 'avif') {
            optimizedBuffer = await sharp(buffer)
                .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
                .avif({ quality })
                .toBuffer();
        } else {
            optimizedBuffer = await sharp(buffer)
                .resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality, progressive: true })
                .toBuffer();
        }
        
        // Return optimized image
        return {
            status: '200',
            statusDescription: 'OK',
            headers: {
                'content-type': [{ value: `image/${outputFormat}` }],
                'content-length': [{ value: optimizedBuffer.length.toString() }],
                'cache-control': [{ value: 'public, max-age=31536000, immutable' }],
                'expires': [{ value: new Date(Date.now() + 31536000000).toUTCString() }],
                'last-modified': [{ value: new Date().toUTCString() }],
                'etag': [{ value: `"${Buffer.from(optimizedBuffer).toString('base64').slice(0, 16)}"` }]
            },
            body: optimizedBuffer.toString('base64'),
            bodyEncoding: 'base64'
        };
        
    } catch (error) {
        console.error('Image optimization error:', error);
        return response;
    }
};
