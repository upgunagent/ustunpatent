import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadSignature() {
    const filePath = path.join(process.cwd(), 'public', 'images', 'mail-signature.png');
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
        console.error('Upload Error:', error);
        return;
    }

    console.log('Upload successful:', data);

    const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(`assets/${fileName}`);

    console.log('Public URL:', publicUrlData.publicUrl);
}

uploadSignature();
