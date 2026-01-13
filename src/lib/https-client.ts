import https from 'https';

export async function httpsGet(url: string, headers: Record<string, string>): Promise<{ status: number; statusText?: string; json: () => Promise<any>; text: () => Promise<string> }> {
    return new Promise((resolve, reject) => {
        const options = {
            headers
        };

        https.get(url, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode || 0,
                    statusText: res.statusMessage,
                    json: async () => JSON.parse(data),
                    text: async () => data
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

export async function httpsDelete(url: string, headers: Record<string, string>): Promise<{ status: number; statusText?: string; json: () => Promise<any>; text: () => Promise<string> }> {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'DELETE',
            headers
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    status: res.statusCode || 0,
                    statusText: res.statusMessage,
                    json: async () => JSON.parse(data),
                    text: async () => data
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}
