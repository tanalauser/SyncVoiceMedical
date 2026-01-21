// config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key to bypass RLS (required after RLS policy update)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection on startup
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        if (error) throw error;
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection error:', error.message);
        return false;
    }
}

// Check Supabase connection status
async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);

        return {
            isConnected: !error,
            state: error ? 'disconnected' : 'connected',
            error: error?.message
        };
    } catch (err) {
        return {
            isConnected: false,
            state: 'error',
            error: err.message
        };
    }
}

module.exports = { supabase, testConnection, checkSupabaseConnection };
