import { supabase } from './supabase/client';

export interface DatabaseStatus {
  isSetup: boolean;
  missingTables: string[];
  error?: string;
}

// Check if all required tables exist and RLS is working
// Add timeout wrapper for database operations
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
    )
  ]);
};

export const checkDatabaseSetup = async (): Promise<DatabaseStatus> => {
  const requiredTables = ['profiles', 'hospitals', 'blood_requests', 'donations'];
  
  try {
    // Do a single connectivity test first with timeout - if this fails, we know the database isn't set up
    const { error: connectivityError } = await withTimeout(
      supabase
        .from('profiles')
        .select('id')
        .limit(0),
      5000 // 5 second timeout for initial check
    );

    // Handle the connectivity test result
    if (connectivityError) {
      // Check for specific error types
      if (connectivityError.code === 'PGRST116' || 
          connectivityError.message?.includes('not find the table') || 
          connectivityError.message?.includes('relation') && connectivityError.message?.includes('does not exist')) {
        // Table doesn't exist - database not set up
        return {
          isSetup: false,
          missingTables: requiredTables,
          error: 'DATABASE_NOT_SETUP'
        };
      } else if (connectivityError.code === '42P17' || connectivityError.message?.includes('infinite recursion detected in policy')) {
        // RLS recursion error
        return {
          isSetup: false,
          missingTables: [],
          error: 'RLS_RECURSION_ERROR'
        };
      } else {
        // Other error - log it but assume database issues
        console.warn('Database connectivity error:', connectivityError);
        return {
          isSetup: false,
          missingTables: requiredTables,
          error: 'DATABASE_NOT_SETUP'
        };
      }
    }

    // If we get here, the profiles table exists and is accessible
    // Now check the other tables quickly
    const missingTables: string[] = [];
    let hasRLSRecursionError = false;

    for (const table of requiredTables.slice(1)) { // Skip profiles since we already checked it
      try {
        const { error } = await withTimeout(
          supabase
            .from(table)
            .select('id')
            .limit(0),
          3000 // 3 second timeout for each table check
        );

        if (error) {
          if (error.code === 'PGRST116' || 
              error.message?.includes('not find the table') || 
              error.message?.includes('relation') && error.message?.includes('does not exist')) {
            missingTables.push(table);
          } else if (error.code === '42P17' || error.message?.includes('infinite recursion detected in policy')) {
            hasRLSRecursionError = true;
            break; // No need to check further if we have RLS issues
          }
        }
      } catch (err: any) {
        // Any exception means the table is problematic
        missingTables.push(table);
      }
    }

    // Handle RLS recursion errors
    if (hasRLSRecursionError) {
      return {
        isSetup: false,
        missingTables: [],
        error: 'RLS_RECURSION_ERROR'
      };
    }

    // Handle missing tables
    if (missingTables.length > 0) {
      return {
        isSetup: false,
        missingTables: ['profiles', ...missingTables], // Include profiles in missing list
        error: 'DATABASE_NOT_SETUP'
      };
    }

    // All tables exist and are accessible - database is set up
    return {
      isSetup: true,
      missingTables: [],
    };

  } catch (error: any) {
    // This catches any network-level errors like "Failed to fetch"
    console.error('Database setup check failed with network error:', error);
    
    if (error.message?.includes('Failed to fetch') || 
        error.name === 'TypeError' ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('timed out')) {
      return {
        isSetup: false,
        missingTables: requiredTables,
        error: 'DATABASE_NOT_SETUP'
      };
    }
    
    return {
      isSetup: false,
      missingTables: requiredTables,
      error: error.message || 'Unknown error occurred while checking database setup'
    };
  }
};

// Create a profile entry with better error handling
export const createUserProfile = async (userId: string, userData: any) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          full_name: userData.full_name || '',
          email: userData.email || '',
          role: userData.role || 'individual',
          profile_complete: false,
          blood_group: 'Not Set',
          availability_status: 'Available'
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        throw new Error('Database tables are not set up. Please run the database setup script first.');
      }
      if (error.code === '42P17' || error.message.includes('infinite recursion')) {
        throw new Error('RLS policies have recursion issues. Please run the SIMPLE_RLS_FIX.sql script.');
      }
      if (error.code === '42501' && error.message.includes('row-level security policy')) {
        throw new Error('RLS policy violation. Please run the SIMPLE_RLS_FIX.sql script to fix policy issues.');
      }
      throw error;
    }

    return { data, error: null };
  } catch (error: any) {
    const isRLSError = error.code === '42P17' || 
                      error.code === '42501' ||
                      error.message?.includes('infinite recursion') ||
                      error.message?.includes('row-level security policy');
    
    return { 
      data: null, 
      error: {
        message: isRLSError 
          ? 'Database RLS policies need to be fixed. Please run the SIMPLE_RLS_FIX.sql script.'
          : error.message || 'Failed to create user profile',
        code: error.code,
        isSetupError: error.code === 'PGRST205' || 
                     error.message?.includes('not find the table') ||
                     isRLSError
      }
    };
  }
};

// Safe query wrapper that handles setup errors
export const safeQuery = async (
  tableName: string, 
  queryFn: () => Promise<any>
): Promise<{ data: any; error: any; isSetupError: boolean }> => {
  try {
    const result = await queryFn();
    return {
      data: result.data,
      error: result.error,
      isSetupError: false
    };
  } catch (error: any) {
    const isSetupError = error.code === 'PGRST205' || 
                        error.message?.includes('not find the table') ||
                        error.message?.includes('relation') && error.message?.includes('does not exist');
    
    return {
      data: null,
      error: {
        message: isSetupError 
          ? `Database table '${tableName}' not found. Please run the database setup script.`
          : error.message || 'An error occurred',
        code: error.code,
        originalError: error
      },
      isSetupError
    };
  }
};