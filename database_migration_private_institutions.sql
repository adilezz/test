-- Migration: Add private institutions table
-- This table will store private schools, universities, and other educational institutions

CREATE TABLE public.private_institutions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_fr character varying(255) NOT NULL,
    name_en character varying(255),
    name_ar character varying(255),
    acronym character varying(20),
    institution_type character varying(50) NOT NULL, -- 'university', 'school', 'institute', 'academy', 'center'
    level character varying(50) NOT NULL, -- 'primary', 'secondary', 'higher', 'professional'
    geographic_entities_id uuid,
    parent_institution_id uuid, -- For hierarchical relationships
    website character varying(500),
    email character varying(255),
    phone character varying(50),
    address text,
    established_year integer,
    accreditation_status character varying(50) DEFAULT 'pending', -- 'pending', 'accredited', 'suspended', 'revoked'
    accreditation_body character varying(255),
    accreditation_date date,
    license_number character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT private_institutions_pkey PRIMARY KEY (id),
    CONSTRAINT private_institutions_geographic_entities_id_fkey FOREIGN KEY (geographic_entities_id) REFERENCES public.geographic_entities(id) ON DELETE SET NULL,
    CONSTRAINT private_institutions_parent_institution_id_fkey FOREIGN KEY (parent_institution_id) REFERENCES public.private_institutions(id) ON DELETE SET NULL,
    CONSTRAINT private_institutions_institution_type_check CHECK (institution_type IN ('university', 'school', 'institute', 'academy', 'center')),
    CONSTRAINT private_institutions_level_check CHECK (level IN ('primary', 'secondary', 'higher', 'professional')),
    CONSTRAINT private_institutions_accreditation_status_check CHECK (accreditation_status IN ('pending', 'accredited', 'suspended', 'revoked'))
);

-- Add indexes for better performance
CREATE INDEX idx_private_institutions_type ON public.private_institutions(institution_type);
CREATE INDEX idx_private_institutions_level ON public.private_institutions(level);
CREATE INDEX idx_private_institutions_geographic ON public.private_institutions(geographic_entities_id);
CREATE INDEX idx_private_institutions_parent ON public.private_institutions(parent_institution_id);
CREATE INDEX idx_private_institutions_active ON public.private_institutions(is_active);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at_private_institutions
    BEFORE UPDATE ON public.private_institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Add comments
COMMENT ON TABLE public.private_institutions IS 'Private educational institutions including schools, universities, institutes, academies, and centers';
COMMENT ON COLUMN public.private_institutions.institution_type IS 'Type of institution: university, school, institute, academy, or center';
COMMENT ON COLUMN public.private_institutions.level IS 'Educational level: primary, secondary, higher, or professional';
COMMENT ON COLUMN public.private_institutions.accreditation_status IS 'Current accreditation status of the institution';
COMMENT ON COLUMN public.private_institutions.accreditation_body IS 'Name of the accrediting body';
COMMENT ON COLUMN public.private_institutions.license_number IS 'Official license or registration number';