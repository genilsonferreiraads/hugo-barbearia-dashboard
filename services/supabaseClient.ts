
// @ts-nocheck
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://dloxhislbxvwdnxlrocf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsb3hoaXNsYnh2d2RueGxyb2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExODg5MTQsImV4cCI6MjA3Njc2NDkxNH0.s9ksgj_HNzkei1vpwh8rYtdmofWuPNEIsEYJp62_0bk';

export const supabase = createClient(supabaseUrl, supabaseKey);
