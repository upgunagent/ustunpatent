const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
    const email = 'ustunpatent@gmail.maill.com';
    const password = '123456';

    console.log(`Checking if user ${email} exists...`);

    // Check if user exists by listing users (not efficient for large bases but fine here)
    // Or just try to create and catch error
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const existingUser = users.users.find(u => u.email === email);

    if (existingUser) {
        console.log('User already exists. Updating password...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password }
        );
        if (updateError) console.error('Error updating password:', updateError);
        else console.log('Password updated successfully.');
    } else {
        console.log('Creating new user...');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error) console.error('Error creating user:', error);
        else console.log('User created successfully:', data.user.id);
    }
}

createAdmin();
