// CloudFront Function for Request Manipulation
// This function optimizes requests for better performance

function handler(event) {
    var request = event.request;
    var headers = request.headers;
    
    // Add security headers
    headers['x-frame-options'] = { value: 'DENY' };
    headers['x-content-type-options'] = { value: 'nosniff' };
    headers['x-xss-protection'] = { value: '1; mode=block' };
    headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
    
    // Optimize for images
    if (request.uri.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        // Add cache headers for images
        headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
        
        // Add WebP support if client supports it
        var acceptHeader = headers['accept'] ? headers['accept'].value : '';
        if (acceptHeader.includes('image/webp')) {
            // Modify request to prefer WebP format
            var uri = request.uri;
            if (uri.match(/\.(jpg|jpeg)$/i)) {
                request.uri = uri.replace(/\.(jpg|jpeg)$/i, '.webp');
            }
        }
    }
    
    // Optimize for CSS and JS files
    if (request.uri.match(/\.(css|js)$/i)) {
        headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
    }
    
    // Optimize for API requests
    if (request.uri.startsWith('/api/')) {
        headers['cache-control'] = { value: 'no-cache, no-store, must-revalidate' };
        headers['pragma'] = { value: 'no-cache' };
        headers['expires'] = { value: '0' };
    }
    
    // Add CORS headers for API requests
    if (request.uri.startsWith('/api/')) {
        headers['access-control-allow-origin'] = { value: '*' };
        headers['access-control-allow-methods'] = { value: 'GET, POST, PUT, DELETE, OPTIONS' };
        headers['access-control-allow-headers'] = { value: 'Content-Type, Authorization' };
    }
    
    return request;
}
