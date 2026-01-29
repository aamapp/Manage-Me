
// Supabase integration removed as requested.
// This file is now redundant.
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
    signUp: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ eq: () => ({ order: () => ({ single: () => ({ data: null, error: null }) }) }) }),
    insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: () => ({ error: null }) }),
    delete: () => ({ eq: () => ({ error: null }) })
  })
} as any;
