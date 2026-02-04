
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials (SERVICE ROLE KEY)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log('Testing upload to contracts bucket...');

    const dummyContent = Buffer.from('Dummy PDF Content');
    const fileName = `test_upload_${Date.now()}.txt`;

    // Attempt upload
    const { data, error } = await supabase.storage
        .from('contracts')
        .upload(fileName, dummyContent, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (error) {
        console.error('Upload Error:', error);
        return;
    }

    console.log('Upload Successful:', data);

    const { data: publicUrlData } = supabase.storage
        .from('contracts')
        .getPublicUrl(fileName);

    console.log('Public URL:', publicUrlData.publicUrl);
}

testUpload();
