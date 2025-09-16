import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function fixTrigger() {
  console.log('🔧 Fixing trigger setup...')

  try {
    // Create a more robust trigger function with error handling
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = ''
      AS $$
      BEGIN
        -- Only insert if profile doesn't already exist
        INSERT INTO public.profiles (id, email, first_name, last_name)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
          COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
          last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
          updated_at = now();

        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't break user creation
          RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
          RETURN NEW;
      END;
      $$;
    `

    console.log('✅ Updated trigger function with error handling')

    // Ensure trigger is properly attached
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `

    await prisma.$executeRaw`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `

    console.log('✅ Recreated trigger')

    // Add missing RLS policy for INSERT operations
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
    `

    await prisma.$executeRaw`
      CREATE POLICY "Enable insert for authenticated users" ON public.profiles
        FOR INSERT WITH CHECK (true);
    `

    console.log('✅ Added INSERT policy for profile creation')

    console.log('🎉 Trigger fix complete!')

  } catch (error) {
    console.error('❌ Error fixing trigger:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixTrigger()