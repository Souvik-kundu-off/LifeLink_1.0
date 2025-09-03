# Lifelink Setup Guide - Updated for RLS Fix

## Quick Start (Recommended)

If you're experiencing RLS recursion errors, follow these simple steps:

### 1. Run the Simple Fix Script
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the entire contents of `SIMPLE_RLS_FIX.sql`
4. Paste and run it in the SQL Editor
5. The app should now work without recursion errors

### 2. What This Fix Does

The `SIMPLE_RLS_FIX.sql` script:
- **Removes all problematic recursive policies** that were causing infinite loops
- **Simplifies RLS to basic authentication** (users can only access their own data)
- **Moves role-based authorization to the application layer** (more reliable and maintainable)
- **Enables smooth profile creation** during user signup

### 3. New Authorization Approach

With this fix, the app uses a hybrid approach:

**Database Level (RLS):**
- Users can only access their own profiles
- Public read access for approved hospitals and active blood requests
- Authenticated users can perform basic operations

**Application Level:**
- Role-based access control (hospital admins, platform admins)
- Complex business logic and permissions
- Cross-table authorization and validation

## Troubleshooting

### Still Getting Errors?

**Error: "table 'profiles' not found"**
- You need to create the database tables first
- Run the complete SQL from `DATABASE_SETUP.md` (sections 1-3)

**Error: "infinite recursion detected"**
- Run `SIMPLE_RLS_FIX.sql` - this completely fixes the issue
- Don't try to run the complex RLS policies from DATABASE_SETUP.md

**Error: "row-level security policy violation"**
- This means RLS is working but blocking access incorrectly
- Run `SIMPLE_RLS_FIX.sql` to use the simplified policies

### Manual Setup (if needed)

If you need to set up from scratch:

1. **Create tables** (DATABASE_SETUP.md section 1)
2. **Skip the complex RLS** (DATABASE_SETUP.md sections 2-3)  
3. **Run SIMPLE_RLS_FIX.sql** instead

## Why This Approach is Better

**Problems with Complex RLS:**
- Recursive policy checking causes infinite loops
- Hard to debug and maintain
- Performance issues with complex cross-table queries
- Difficult to modify business logic

**Benefits of Simplified Approach:**
- No recursion issues - policies are simple and direct
- Better performance - minimal database-level checking
- Easier to maintain and modify permissions
- Clear separation between authentication and authorization
- More flexible business logic implementation

## Application Features

Once setup is complete, the application provides:

✅ **Multi-role authentication** (individuals, hospital admins, platform admins)  
✅ **Profile management** with location and blood type  
✅ **Blood request creation and management**  
✅ **Donor-recipient matching** with compatibility algorithms  
✅ **Hospital application and verification**  
✅ **Real-time notifications** for urgent requests  
✅ **Analytics and reporting** for hospitals and admins  
✅ **Secure authorization** at the application layer  

## Support

If you continue to have issues:
1. Check that you've run the complete `SIMPLE_RLS_FIX.sql` script
2. Verify all tables exist in your Supabase dashboard
3. Make sure your Supabase connection details are correct
4. Check the browser console for specific error messages