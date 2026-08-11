-- Migration Name: 20260810000000_init_schema
-- Description: Sets up the initial database schema for the VetAnimals MVP with security and integrity corrections.
-- Approved Rules:
-- 1. Keeps public.Hackatn untouched.
-- 2. Profiles roles: user, veterinarian, admin.
-- 3. One veterinarian -> one clinic.
-- 4. Favorites check constraint for exactly one target.
-- 5. Species column as text NULL in products.
-- 6. Numeric for monetary values.
-- 7. created_at/updated_at timestamps.
-- 8. UUID primary keys with native gen_random_uuid() (No extensions needed).
-- 9. Secure is_admin() function to prevent RLS recursion.
-- 10. Explicit search_path set on all SECURITY DEFINER functions.
-- 11. Custom BEFORE UPDATE trigger on appointments to enforce column-level security.
-- 12. Custom BEFORE UPDATE trigger on profiles to prevent role/email self-escalation.
-- 13. Rating removed from clinics table.

-- ---------------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS, HELPER FUNCTIONS & TRIGGER PROCEDURES
-- ---------------------------------------------------------------------------

-- Automatically update updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

-- Secure helper function to check admin role and avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ language plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to sync auth.users with public.profiles securely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'user' -- Secure default, ignores user-supplied meta role values
    );
    RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to prevent users from escalating their own role or changing their email
CREATE OR REPLACE FUNCTION public.check_profile_update_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Admins have unrestricted update rights
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- 2. Normal users cannot change their role
    IF OLD.role <> NEW.role THEN
        RAISE EXCEPTION 'You are not allowed to change your user role.';
    END IF;

    -- 3. Normal users cannot change their email directly (must go through Supabase Auth)
    IF OLD.email <> NEW.email THEN
        RAISE EXCEPTION 'Email updates must go through Supabase Auth.';
    END IF;

    RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to enforce column-level security on appointment updates
CREATE OR REPLACE FUNCTION public.check_appointment_update_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Admins have unrestricted update rights
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- 2. Enforcement for regular users (appointment owners)
    IF auth.uid() = OLD.user_id THEN
        -- Owners can ONLY cancel a pending appointment (changing status from 'pending' to 'cancelled').
        -- They cannot modify other fields (user_id, pet_id, veterinarian_id, clinic_id, appointment_date, notes).
        IF NEW.status <> 'cancelled' OR
           OLD.user_id <> NEW.user_id OR
           OLD.pet_id <> NEW.pet_id OR
           OLD.veterinarian_id <> NEW.veterinarian_id OR
           OLD.clinic_id <> NEW.clinic_id OR
           OLD.appointment_date <> NEW.appointment_date OR
           COALESCE(OLD.notes, '') <> COALESCE(NEW.notes, '') THEN
            RAISE EXCEPTION 'Users can only cancel their own pending appointments without modifying details.';
        END IF;

        IF OLD.status <> 'pending' THEN
            RAISE EXCEPTION 'Only pending appointments can be cancelled.';
        END IF;

        RETURN NEW;
    END IF;

    -- 3. Enforcement for veterinarians
    IF EXISTS (
        SELECT 1 FROM public.veterinarians v
        WHERE v.id = OLD.veterinarian_id AND v.user_id = auth.uid()
    ) THEN
        -- Veterinarians can update status and notes, but not immutable appointment metadata
        IF OLD.user_id <> NEW.user_id OR
           OLD.pet_id <> NEW.pet_id OR
           OLD.veterinarian_id <> NEW.veterinarian_id OR
           OLD.clinic_id <> NEW.clinic_id OR
           OLD.appointment_date <> NEW.appointment_date THEN
            RAISE EXCEPTION 'Veterinarians can only update appointment status and notes.';
        END IF;

        RETURN NEW;
    END IF;

    -- 4. Reject all other update attempts
    RAISE EXCEPTION 'Unauthorized appointment update.';
END;
$$ language plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 2. TABLE CREATION (Ordered to respect foreign key constraints)
-- ---------------------------------------------------------------------------

-- Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    email text NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'veterinarian', 'admin')),
    phone text
);

-- Categories (Products categories)
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    price numeric NOT NULL CHECK (price >= 0),
    image_url text,
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active boolean NOT NULL DEFAULT true,
    species text -- flexible text field as requested (supporting dog, cat, bird, etc.)
);

-- Clinics (Veterinary Clinics)
CREATE TABLE IF NOT EXISTS public.clinics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    address text NOT NULL,
    phone text,
    email text,
    latitude numeric,
    longitude numeric,
    website text
);

-- Veterinarians (One veterinarian -> one clinic)
CREATE TABLE IF NOT EXISTS public.veterinarians (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    name text NOT NULL,
    specialty text,
    bio text,
    avatar_url text,
    license_number text
);

-- Pets (One user -> many pets)
CREATE TABLE IF NOT EXISTS public.pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL,
    breed text,
    birth_date date,
    gender text CHECK (gender IN ('male', 'female', 'unknown')),
    weight numeric CHECK (weight >= 0),
    avatar_url text
);

-- Appointments (Schedules veterinary sessions)
CREATE TABLE IF NOT EXISTS public.appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    veterinarian_id uuid NOT NULL REFERENCES public.veterinarians(id) ON DELETE CASCADE,
    clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
    appointment_date timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes text
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled', 'completed')),
    total_amount numeric NOT NULL CHECK (total_amount >= 0),
    shipping_address text NOT NULL,
    payment_intent_id text
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    price_at_purchase numeric NOT NULL CHECK (price_at_purchase >= 0)
);

-- Favorites (Saves user-favorited products, veterinarians, or clinics)
CREATE TABLE IF NOT EXISTS public.favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    veterinarian_id uuid REFERENCES public.veterinarians(id) ON DELETE CASCADE,
    clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
    CONSTRAINT favorites_target_check CHECK (num_nonnulls(product_id, veterinarian_id, clinic_id) = 1)
);

-- ---------------------------------------------------------------------------
-- 3. INDEXES (Optimizing query performance on foreign keys)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS pets_owner_id_idx ON public.pets(owner_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS veterinarians_clinic_id_idx ON public.veterinarians(clinic_id);
CREATE INDEX IF NOT EXISTS veterinarians_user_id_idx ON public.veterinarians(user_id);
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_pet_id_idx ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS appointments_veterinarian_id_idx ON public.appointments(veterinarian_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);

-- Partial unique indexes to prevent duplicate favorites per user per target type
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_product_idx ON public.favorites (user_id, product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_vet_idx ON public.favorites (user_id, veterinarian_id) WHERE veterinarian_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_clinic_idx ON public.favorites (user_id, clinic_id) WHERE clinic_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. TRIGGERS FOR TIMESTAMPS & BUSINESS INTEGRITY
-- ---------------------------------------------------------------------------

-- Assign updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_pets_updated_at ON public.pets;
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_clinics_updated_at ON public.clinics;
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_veterinarians_updated_at ON public.veterinarians;
CREATE TRIGGER update_veterinarians_updated_at BEFORE UPDATE ON public.veterinarians FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Assign auth.users -> profiles trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Assign profile integrity check trigger
DROP TRIGGER IF EXISTS check_profile_update_integrity ON public.profiles;
CREATE TRIGGER check_profile_update_integrity
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_update_integrity();

-- Assign appointment integrity check trigger
DROP TRIGGER IF EXISTS check_appointment_update_integrity ON public.appointments;
CREATE TRIGGER check_appointment_update_integrity
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.check_appointment_update_integrity();

-- ---------------------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veterinarians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Cleanup existing policies to avoid duplicates on re-migration
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

DROP POLICY IF EXISTS "Products are readable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

DROP POLICY IF EXISTS "Clinics are readable by everyone" ON public.clinics;
DROP POLICY IF EXISTS "Admins can manage clinics" ON public.clinics;

DROP POLICY IF EXISTS "Veterinarians are readable by everyone" ON public.veterinarians;
DROP POLICY IF EXISTS "Admins can manage veterinarians" ON public.veterinarians;
DROP POLICY IF EXISTS "Veterinarians can update their own profile" ON public.veterinarians;

DROP POLICY IF EXISTS "Owners can manage their own pets" ON public.pets;
DROP POLICY IF EXISTS "Veterinarians can view pets with appointments" ON public.pets;

DROP POLICY IF EXISTS "Users can select own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Veterinarians can select assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can select all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Veterinarians can update assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can cancel their own pending orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view items in their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert items for their own orders" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;


-- --- PROFILES POLICIES ---
CREATE POLICY "Profiles are viewable by authenticated users" 
    ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- --- CATEGORIES POLICIES ---
CREATE POLICY "Categories are readable by everyone" 
    ON public.categories FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage categories" 
    ON public.categories FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- --- PRODUCTS POLICIES ---
CREATE POLICY "Products are readable by everyone" 
    ON public.products FOR SELECT TO public 
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage products" 
    ON public.products FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- --- CLINICS POLICIES ---
CREATE POLICY "Clinics are readable by everyone" 
    ON public.clinics FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage clinics" 
    ON public.clinics FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- --- VETERINARIANS POLICIES ---
CREATE POLICY "Veterinarians are readable by everyone" 
    ON public.veterinarians FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage veterinarians" 
    ON public.veterinarians FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Veterinarians can update their own profile" 
    ON public.veterinarians FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- --- PETS POLICIES ---
CREATE POLICY "Owners can manage their own pets" 
    ON public.pets FOR ALL TO authenticated 
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Veterinarians can view pets with appointments" 
    ON public.pets FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.appointments a
        JOIN public.veterinarians v ON a.veterinarian_id = v.id
        WHERE a.pet_id = pets.id AND v.user_id = auth.uid()
    ));


-- --- APPOINTMENTS POLICIES ---
CREATE POLICY "Users can select own appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Veterinarians can select assigned appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.veterinarians v WHERE v.id = appointments.veterinarian_id AND v.user_id = auth.uid()
    ));

CREATE POLICY "Admins can select all appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Users can insert own appointments"
    ON public.appointments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert appointments"
    ON public.appointments FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own appointments"
    ON public.appointments FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Veterinarians can update assigned appointments"
    ON public.appointments FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.veterinarians v WHERE v.id = appointments.veterinarian_id AND v.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.veterinarians v WHERE v.id = appointments.veterinarian_id AND v.user_id = auth.uid()
    ));

CREATE POLICY "Admins can update all appointments"
    ON public.appointments FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete appointments"
    ON public.appointments FOR DELETE TO authenticated
    USING (public.is_admin());


-- --- ORDERS POLICIES ---
CREATE POLICY "Users can view their own orders" 
    ON public.orders FOR SELECT TO authenticated 
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own orders" 
    ON public.orders FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own pending orders" 
    ON public.orders FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id AND status = 'pending') 
    WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE POLICY "Admins can manage all orders" 
    ON public.orders FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- --- ORDER ITEMS POLICIES ---
CREATE POLICY "Users can view items in their own orders" 
    ON public.order_items FOR SELECT TO authenticated 
    USING (EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    ));

CREATE POLICY "Users can insert items for their own orders" 
    ON public.order_items FOR INSERT TO authenticated 
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage all order items" 
    ON public.order_items FOR ALL TO authenticated 
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- --- FAVORITES POLICIES ---
CREATE POLICY "Users can manage their own favorites" 
    ON public.favorites FOR ALL TO authenticated 
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
