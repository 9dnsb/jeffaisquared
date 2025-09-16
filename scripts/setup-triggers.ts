import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function setupTriggers() {
  console.log('Setting up database triggers...')

  try {
    // Grant necessary permissions for custom prisma user
    await prisma.$executeRaw`
      GRANT USAGE ON SCHEMA auth TO prisma;
    `

    await prisma.$executeRaw`
      GRANT SELECT ON auth.users TO prisma;
    `

    await prisma.$executeRaw`
      GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, prisma;
    `

    await prisma.$executeRaw`
      GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, prisma;
    `

    // Function to handle new user registration with proper security context
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, auth
      AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, first_name, last_name)
        VALUES (
          NEW.id,
          NEW.email,
          NEW.raw_user_meta_data ->> 'first_name',
          NEW.raw_user_meta_data ->> 'last_name'
        );
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
          RETURN NEW;
      END;
      $$;
    `

    // Drop existing trigger if it exists
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `

    // Create trigger
    await prisma.$executeRaw`
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `

    // Enable Row Level Security
    await prisma.$executeRaw`
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    `

    // Drop existing policies if they exist
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    `

    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    `

    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
    `

    // Create RLS policies
    await prisma.$executeRaw`
      CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    `

    await prisma.$executeRaw`
      CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);
    `

    await prisma.$executeRaw`
      CREATE POLICY "System can insert profiles" ON public.profiles
        FOR INSERT WITH CHECK (true);
    `

    console.log('Database triggers set up successfully!')
  } catch (error) {
    console.error('Error setting up triggers:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupTriggers()