import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function debugTrigger() {
  console.log('🔍 Debugging trigger setup...')

  try {
    // Check if profiles table exists and its structure
    console.log('\n📋 Profiles table structure:')
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `
    console.log(columns)

    // Check if trigger function exists
    console.log('\n🔧 Trigger function status:')
    const triggerExists = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'handle_new_user'
        AND routine_schema = 'public'
      ) as exists;
    `
    console.log('Function exists:', triggerExists)

    // Check trigger function definition
    try {
      const functionDef = await prisma.$queryRaw`
        SELECT prosrc as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';
      `
      console.log('Function definition:', functionDef)
    } catch (err) {
      console.log('Could not retrieve function definition:', err)
    }

    // Check if trigger exists
    console.log('\n⚡ Trigger status:')
    const triggerActive = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
      ) as exists;
    `
    console.log('Trigger active:', triggerActive)

    // Check for any existing profiles
    console.log('\n👥 Existing profiles:')
    const profileCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM public.profiles;
    `
    console.log('Profile count:', profileCount)

    // Check auth schema access
    console.log('\n🔐 Auth schema access test:')
    try {
      const authTest = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM auth.users;
      `
      console.log('Can access auth.users:', authTest)
    } catch (err) {
      console.log('Cannot access auth.users:', err)
    }

    console.log('\n✅ Debug complete!')

  } catch (error) {
    console.error('❌ Debug error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugTrigger()