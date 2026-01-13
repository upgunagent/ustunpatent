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
