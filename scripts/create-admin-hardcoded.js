const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qmotrqehdzebojdowuol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createAdmin() {
    const email = 'ustunpatent@gmail.maill.com'; // User's specific typo preserved
    const password = '123456';

    console.log(`Checking if user ${email} exists...`);

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        // return; 
    }

    const existingUser = users?.users?.find(u => u.email === email);

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
