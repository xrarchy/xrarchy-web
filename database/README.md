## Database Fix Required

You need to run the SQL script in your Supabase database to fix the foreign key relationships.

### Steps:
1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
2. Navigate to your project
3. Go to the SQL Editor
4. Copy and paste the content from `database/fix-foreign-keys.sql`
5. Click "Run" to execute the SQL

### What this fixes:
- Changes `assigned_to` column to `assigned_user_id` to match API expectations
- Adds `project_role` column for user roles within projects
- Adds proper foreign key relationships that the API is looking for
- Updates the table structure to match the simplified schema

After running this SQL, your project management system should work correctly!

### Alternative: Manual Database Commands
If you have direct database access, you can also run:
```bash
psql -h [your-db-host] -U [your-username] -d [your-database] -f database/fix-foreign-keys.sql
```
