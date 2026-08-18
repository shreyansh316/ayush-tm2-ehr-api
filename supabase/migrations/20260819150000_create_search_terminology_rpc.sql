-- Enable pg_trgm extension for fuzzy multilingual similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create Trigram GIN indexes for fast searching across columns
CREATE INDEX IF NOT EXISTS idx_name_english_trgm ON public."Namaste_code" USING gin ("Name English" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_hinglish_trgm ON public."Namaste_code" USING gin ("Hinglish" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_namc_devanagari_trgm ON public."Namaste_code" USING gin ("Namc Term Devanagari" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tm2_code ON public."Namaste_code" ("TM2 Code");
CREATE INDEX IF NOT EXISTS idx_ayurveda_code ON public."Namaste_code" ("Ayurveda Code");

-- Create the fuzzy search RPC function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.search_terminology(search_term text)
RETURNS SETOF public."Namaste_code"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    cleaned text;
BEGIN
    cleaned := trim(search_term);
    IF cleaned IS NULL OR cleaned = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT *
    FROM public."Namaste_code" n
    WHERE 
        coalesce(n."Name English", '') ILIKE '%' || cleaned || '%'
        OR coalesce(n."Hinglish", '') ILIKE '%' || cleaned || '%'
        OR coalesce(n."Namc Term Devanagari", '') ILIKE '%' || cleaned || '%'
        OR coalesce(n."TM2 Code", '') ILIKE '%' || cleaned || '%'
        OR coalesce(n."Ayurveda Code", '') ILIKE '%' || cleaned || '%'
        OR similarity(coalesce(n."Name English", ''), cleaned) >= 0.15
        OR similarity(coalesce(n."Hinglish", ''), cleaned) >= 0.15
        OR similarity(coalesce(n."Namc Term Devanagari", ''), cleaned) >= 0.15
    ORDER BY 
        CASE 
            WHEN n."TM2 Code" ILIKE '%' || cleaned || '%' THEN 1
            WHEN n."Ayurveda Code" ILIKE '%' || cleaned || '%' THEN 2
            WHEN n."Name English" ILIKE '%' || cleaned || '%' THEN 3
            ELSE 4
        END,
        n."Sr No." ASC
    LIMIT 50;
END;
$$;

-- Grant execution permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.search_terminology(text) TO anon, authenticated, service_role;
