-- Create tables for the LinkVault application

-- Categorias table
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Subcategorias table
CREATE TABLE IF NOT EXISTS public.subcategorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Links table
CREATE TABLE IF NOT EXISTS public.links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) NOT NULL,
    subcategoria_id UUID REFERENCES public.subcategorias(id) NULL,
    descricao TEXT NULL,
    imagem_url TEXT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS links_user_id_idx ON public.links(user_id);
CREATE INDEX IF NOT EXISTS links_categoria_id_idx ON public.links(categoria_id);
CREATE INDEX IF NOT EXISTS links_subcategoria_id_idx ON public.links(subcategoria_id);
CREATE INDEX IF NOT EXISTS subcategorias_categoria_id_idx ON public.subcategorias(categoria_id);

-- Set up Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Categorias policies
CREATE POLICY "Categorias are viewable by everyone" 
ON public.categorias FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Categorias can be inserted by authenticated users" 
ON public.categorias FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Categorias can be updated by authenticated users" 
ON public.categorias FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Categorias can be deleted by authenticated users" 
ON public.categorias FOR DELETE 
TO authenticated 
USING (true);

-- Subcategorias policies
CREATE POLICY "Subcategorias are viewable by everyone" 
ON public.subcategorias FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Subcategorias can be inserted by authenticated users" 
ON public.subcategorias FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Subcategorias can be updated by authenticated users" 
ON public.subcategorias FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Subcategorias can be deleted by authenticated users" 
ON public.subcategorias FOR DELETE 
TO authenticated 
USING (true);

-- Links policies
CREATE POLICY "Users can view their own links" 
ON public.links FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links" 
ON public.links FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" 
ON public.links FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" 
ON public.links FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Insert default categories
INSERT INTO public.categorias (nome) VALUES 
('Trabalho'),
('Estudos'),
('Pessoal'),
('Favoritos')
ON CONFLICT DO NOTHING;