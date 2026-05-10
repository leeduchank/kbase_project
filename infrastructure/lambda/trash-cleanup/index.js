import http from 'http';
import https from 'https';

/**
 * AWS Lambda function to trigger the KBase trash cleanup job.
 * 
 * Environment Variables Required:
 * - STORAGE_SERVICE_URL: The internal URL to the storage service purge endpoint.
 *   Example: http://internal-kbase-alb-12345.ap-southeast-1.elb.amazonaws.com/storage/internal/trash/purge
 */
export const handler = async (event) => {
    console.log("Triggering trash cleanup on storage service");
    
    // Read and clean the URL (remove spaces, newlines, and quotes)
    let rawUrl = process.env.STORAGE_SERVICE_URL || 'http://kbase-storage-service/storage/internal/trash/purge';
    rawUrl = rawUrl.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    
    console.log(`Using URL: [${rawUrl}]`);
    
    const client = rawUrl.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
        try {
            // URL validation check to catch errors early with a clear message
            new URL(rawUrl);
        } catch (err) {
            console.error(`ERROR: The provided URL [${rawUrl}] is invalid. Please check your STORAGE_SERVICE_URL environment variable. It must start with http:// or https://`);
            return reject(new Error(`Invalid URL format: ${rawUrl}`));
        }

        const req = client.request(rawUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', chunk => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`Cleanup success: HTTP ${res.statusCode}`, data);
                    resolve({
                        statusCode: res.statusCode,
                        body: data
                    });
                } else {
                    console.error(`Cleanup failed: HTTP ${res.statusCode}`, data);
                    reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', (e) => {
            console.error(`Request error: ${e.message}`, e);
            reject(e);
        });
        
        // Timeout after 30 seconds
        req.setTimeout(30000, () => {
            console.error("Request timed out");
            req.abort();
            reject(new Error("Request timed out after 30s"));
        });
        
        req.end();
    });
};
