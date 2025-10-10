import { getSupabaseClient } from './supabase-client'

export async function executeSQL(sql: string): Promise<unknown[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('exec_sql_query', {
    sql_query: sql,
  })

  if (error) {
    console.error('Error executing SQL:', error)
    throw new Error(error.message)
  }

  // Parse JSON result
  const results = typeof data === 'string' ? JSON.parse(data) : data
  return Array.isArray(results) ? results : []
}
