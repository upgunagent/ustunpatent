import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envResult = dotenv.config({ path: '.env.local' });
if (envResult.error) {
    console.error('Error loading .env.local:', envResult.error);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    console.log('NEXT_PUBLIC_SUPABASE_URL present:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadSignature() {
    try {
        const filePath = path.join(process.cwd(), 'public', 'images', 'mail-signature.png');
        if (!fs.existsSync(filePath)) {
            console.error(`File not found at: ${filePath}`);
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const fileName = 'mail-signature.png';
        const bucketName = 'firm-logos';

        console.log(`Uploading ${fileName} to bucket ${bucketName}...`);

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(`assets/${fileName}`, fileBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            console.error('Supabase Upload Error:', JSON.stringify(error, null, 2));
            return;
        }

        console.log('Upload successful:', data);

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`assets/${fileName}`);

        console.log('Public URL:', publicUrlData.publicUrl);
    } catch (err) {
        console.error('Unexpected error in uploadSignature:', err);
    }
}

uploadSignature();
