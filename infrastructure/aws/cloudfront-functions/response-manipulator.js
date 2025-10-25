// CloudFront Function for Response Manipulation
// This function optimizes responses for better performance

function handler(event) {
    var response = event.response;
    var headers = response.headers;
    
    // Add security headers to all responses
    headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains' };
    headers['content-security-policy'] = { 
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
    };
    
    // Optimize cache headers based on content type
    var contentType = headers['content-type'] ? headers['content-type'].value : '';
    
    if (contentType.includes('image/')) {
        headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
        headers['expires'] = { value: new Date(Date.now() + 31536000000).toUTCString() };
    } else if (contentType.includes('text/css') || contentType.includes('application/javascript')) {
        headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
        headers['expires'] = { value: new Date(Date.now() + 31536000000).toUTCString() };
    } else if (contentType.includes('application/json')) {
        headers['cache-control'] = { value: 'no-cache, no-store, must-revalidate' };
        headers['pragma'] = { value: 'no-cache' };
        headers['expires'] = { value: '0' };
    } else if (contentType.includes('text/html')) {
        headers['cache-control'] = { value: 'public, max-age=3600' };
        headers['expires'] = { value: new Date(Date.now() + 3600000).toUTCString() };
    }
    
    // Add compression headers
    headers['vary'] = { value: 'Accept-Encoding' };
    
    // Add performance headers
    headers['x-dns-prefetch-control'] = { value: 'on' };
    headers['x-download-options'] = { value: 'noopen' };
    
    // Remove server information
    delete headers['server'];
    delete headers['x-powered-by'];
    
    return response;
}
