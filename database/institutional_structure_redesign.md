# Institutional Structure Redesign - theses.ma

## 📊 Current Problems

### 1. **Ambiguous Structure**
Current tables:
- `universities` - Only for universities
- `faculties` - Only under universities
- `schools` - Can be under universities OR other schools (confusing)
- `departments` - Can be under faculties OR schools

**Problems:**
- ❌ Can't properly model Grandes Écoles (ENSA, ENCG, etc.)
- ❌ Can't distinguish public vs private institutions
- ❌ Can't model standalone institutes (ISCAE, INPT, etc.)
- ❌ No support for private universities
- ❌ No distinction between organizational units and academic programs
- ❌ No multi-campus support
- ❌ Missing key metadata (founding date, accreditation, etc.)

### 2. **Moroccan Institutional Reality**

Based on analysis of 600+ institutions:

**Public Sector:**
- 11 Public Universities with 103 Faculties and 74 Schools
- 93 Standalone Institutes & Grandes Écoles
- Examples:
  - Université Mohammed V → Faculté des Sciences → Département
  - Université Hassan II → École Mohammadia d'Ingénieurs (EMI)
  - Standalone: ISCAE, INPT, ENSA (not all under universities)

**Private Sector:**
- 19 Private Universities
- 243 Private Schools/Institutes
- Examples:
  - Université Internationale de Rabat (UIR)
  - Al Akhawayn University
  - Standalone: HEM, EMSI, ESCA, etc.

### 3. **Missing Concepts**

- **Département** (administrative unit) ≠ **Filière** (study program)
- **Filière** (program track) ≠ **Spécialité** (specialization)
- Multi-campus institutions
- Institution groups (e.g., HEM network, EMSI campuses)

---

## ✅ PROPOSED SOLUTION

### **New Institutional Model**

```
┌─────────────────────────────────────────────────────────────┐
│                      INSTITUTIONS                            │
│  (Universities, Grandes Écoles, Institutes, Schools)         │
│  ├─ Institution Type (enum)                                  │
│  ├─ Ownership Type (public/private/semi-public)              │
│  ├─ Accreditation Status                                     │
│  └─ Parent Institution (for networks/groups)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                 INSTITUTION_CAMPUSES                         │
│  (Physical locations for multi-campus institutions)          │
│  ├─ Campus Name                                              │
│  ├─ Geographic Location                                      │
│  └─ Is Main Campus                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              ORGANIZATIONAL_UNITS                            │
│  (Faculties, Schools, Departments, Sections)                 │
│  ├─ Unit Type (faculty/school/department/section)            │
│  ├─ Parent Unit (hierarchical)                               │
│  ├─ Campus (if multi-campus)                                 │
│  └─ Administrative vs Academic                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  STUDY_PROGRAMS                              │
│  (Filières - actual academic programs)                       │
│  ├─ Program Name (Licence Informatique, etc.)                │
│  ├─ Degree Type (Licence, Master, Doctorat)                  │
│  ├─ Discipline                                               │
│  └─ Organizational Unit                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  SPECIALIZATIONS                             │
│  (Spécialités within programs)                               │
│  ├─ Specialization Name                                      │
│  ├─ Study Program                                            │
│  └─ Description                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 NEW DATABASE STRUCTURE

### 1. **INSTITUTIONS** (Replaces universities + adds more types)

```sql
CREATE TYPE institution_type AS ENUM (
    'public_university',
    'private_university',
    'grande_ecole',           -- ENSA, ENCG, INPT, EMI, etc.
    'professional_institute',  -- ISCAE, INSAP, etc.
    'private_school',
    'research_institute',
    'specialized_institute'    -- ISM, religious institutes, etc.
);

CREATE TYPE ownership_type AS ENUM (
    'public',
    'private',
    'semi_public',
    'international',
    'military',
    'religious'
);

CREATE TYPE accreditation_status AS ENUM (
    'accredited',
    'provisional',
    'pending',
    'not_accredited'
);

CREATE TABLE institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Names (multilingual)
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    official_name_fr VARCHAR(500),  -- Full official name
    official_name_ar VARCHAR(500),
    acronym VARCHAR(20),
    
    -- Classification
    institution_type institution_type NOT NULL,
    ownership_type ownership_type NOT NULL,
    accreditation_status accreditation_status DEFAULT 'accredited',
    
    -- Hierarchy (for institution groups/networks)
    parent_institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    -- Example: HEM Casablanca → parent: HEM Group
    
    -- Location (default/main)
    geographic_entity_id UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
    
    -- Metadata
    founded_year INTEGER,
    recognition_date DATE,  -- Date of official recognition
    accreditation_number VARCHAR(50),
    accreditation_date DATE,
    
    -- Authority
    supervising_ministry VARCHAR(255),  -- Ministère de tutelle
    
    -- Contact & Online
    website_url VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(30),
    address TEXT,
    
    -- Social & Rankings
    international_ranking INTEGER,
    national_ranking INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    closure_date DATE,
    
    -- Stats (denormalized for performance)
    total_students INTEGER DEFAULT 0,
    total_faculty INTEGER DEFAULT 0,
    total_theses INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (founded_year IS NULL OR founded_year >= 1900)
);

CREATE INDEX idx_institutions_type ON institutions(institution_type);
CREATE INDEX idx_institutions_ownership ON institutions(ownership_type);
CREATE INDEX idx_institutions_parent ON institutions(parent_institution_id);
CREATE INDEX idx_institutions_geo ON institutions(geographic_entity_id);
CREATE INDEX idx_institutions_active ON institutions(is_active);
CREATE INDEX idx_institutions_name ON institutions(name_fr);
```

### 2. **INSTITUTION_CAMPUSES** (Multi-campus support)

```sql
CREATE TABLE institution_campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    
    -- Campus Info
    campus_name_fr VARCHAR(255) NOT NULL,
    campus_name_en VARCHAR(255),
    campus_name_ar VARCHAR(255),
    campus_code VARCHAR(20),
    
    -- Location
    geographic_entity_id UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
    address TEXT,
    postal_code VARCHAR(10),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    
    -- Details
    is_main_campus BOOLEAN DEFAULT false,
    campus_area_hectares NUMERIC(10,2),
    established_year INTEGER,
    
    -- Contact
    phone VARCHAR(30),
    email VARCHAR(255),
    
    -- Facilities
    has_library BOOLEAN DEFAULT true,
    has_labs BOOLEAN DEFAULT false,
    has_sports_facilities BOOLEAN DEFAULT false,
    has_dormitories BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (institution_id, campus_code)
);

CREATE INDEX idx_campuses_institution ON institution_campuses(institution_id);
CREATE INDEX idx_campuses_geo ON institution_campuses(geographic_entity_id);
```

### 3. **ORGANIZATIONAL_UNITS** (Replaces faculties + schools + departments)

```sql
CREATE TYPE organizational_unit_type AS ENUM (
    'faculty',           -- Faculté
    'school',           -- École
    'institute',        -- Institut
    'department',       -- Département
    'section',          -- Section
    'laboratory',       -- Laboratoire
    'center',           -- Centre
    'division'          -- Division
);

CREATE TABLE organizational_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hierarchy
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    parent_unit_id UUID REFERENCES organizational_units(id) ON DELETE CASCADE,
    campus_id UUID REFERENCES institution_campuses(id) ON DELETE SET NULL,
    
    -- Names
    name_en VARCHAR(500),
    name_fr VARCHAR(500) NOT NULL,
    name_ar VARCHAR(500),
    acronym VARCHAR(50),
    
    -- Classification
    unit_type organizational_unit_type NOT NULL,
    
    -- Hierarchy level (auto-calculated or manual)
    hierarchy_level INTEGER DEFAULT 1,
    -- Level 1: Faculty/School
    -- Level 2: Department
    -- Level 3: Section
    
    -- Details
    description_fr TEXT,
    description_en TEXT,
    established_year INTEGER,
    
    -- Contact
    head_person_id UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(30),
    office_location VARCHAR(255),
    
    -- Administrative
    is_research_unit BOOLEAN DEFAULT false,
    is_teaching_unit BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_org_units_institution ON organizational_units(institution_id);
CREATE INDEX idx_org_units_parent ON organizational_units(parent_unit_id);
CREATE INDEX idx_org_units_campus ON organizational_units(campus_id);
CREATE INDEX idx_org_units_type ON organizational_units(unit_type);
CREATE INDEX idx_org_units_level ON organizational_units(hierarchy_level);
```

### 4. **STUDY_PROGRAMS** (NEW - Filières)

```sql
CREATE TYPE program_level AS ENUM (
    'bac_2',            -- DUT, BTS
    'licence',          -- Licence (Bac+3)
    'licence_pro',      -- Licence Professionnelle
    'master',           -- Master (Bac+5)
    'master_spe',       -- Master Spécialisé
    'doctorat',         -- Doctorat (PhD)
    'diplome_ingenieur',-- Diplôme d'Ingénieur
    'diplome_grande_ecole', -- Grande École diploma
    'executive',        -- Executive programs
    'other'
);

CREATE TABLE study_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Affiliation
    organizational_unit_id UUID NOT NULL REFERENCES organizational_units(id) ON DELETE CASCADE,
    discipline_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,  -- Main discipline
    
    -- Names
    program_name_fr VARCHAR(500) NOT NULL,
    program_name_en VARCHAR(500),
    program_name_ar VARCHAR(500),
    program_code VARCHAR(50),
    
    -- Classification
    program_level program_level NOT NULL,
    degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
    
    -- Details
    description_fr TEXT,
    duration_years NUMERIC(3,1),  -- Can be 2.5 years, etc.
    total_credits INTEGER,        -- ECTS credits
    
    -- Language of instruction
    instruction_language_ids UUID[],
    
    -- Accreditation
    is_accredited BOOLEAN DEFAULT true,
    accreditation_number VARCHAR(100),
    accreditation_date DATE,
    accreditation_expiry DATE,
    
    -- Admission
    admission_requirements TEXT,
    admission_capacity INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    start_year INTEGER,
    end_year INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programs_unit ON study_programs(organizational_unit_id);
CREATE INDEX idx_programs_discipline ON study_programs(discipline_id);
CREATE INDEX idx_programs_level ON study_programs(program_level);
CREATE INDEX idx_programs_degree ON study_programs(degree_id);
```

### 5. **SPECIALIZATIONS** (NEW - Spécialités)

```sql
CREATE TABLE specializations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    study_program_id UUID NOT NULL REFERENCES study_programs(id) ON DELETE CASCADE,
    
    -- Names
    specialization_name_fr VARCHAR(255) NOT NULL,
    specialization_name_en VARCHAR(255),
    specialization_name_ar VARCHAR(255),
    specialization_code VARCHAR(50),
    
    -- Details
    description_fr TEXT,
    description_en TEXT,
    
    -- Disciplines (can span multiple)
    primary_discipline_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_specializations_program ON specializations(study_program_id);
CREATE INDEX idx_specializations_discipline ON specializations(primary_discipline_id);
```

### 6. **DISCIPLINES** (Renamed from categories)

```sql
-- This is the renamed and enhanced version of 'categories'

CREATE TABLE disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Hierarchy
    parent_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    
    -- Identification
    code VARCHAR(50) NOT NULL UNIQUE,
    unesco_code VARCHAR(20),  -- UNESCO classification codes
    
    -- Names
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    
    -- Details
    description_en TEXT,
    description_fr TEXT,
    description_ar TEXT,
    
    -- Classification
    field_of_study VARCHAR(100),  -- 'sciences', 'humanities', 'engineering', etc.
    
    -- Display
    display_order INTEGER DEFAULT 0,
    color_hex VARCHAR(7),  -- For UI visualization
    icon_name VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disciplines_parent ON disciplines(parent_id);
CREATE INDEX idx_disciplines_code ON disciplines(code);
CREATE INDEX idx_disciplines_field ON disciplines(field_of_study);
CREATE INDEX idx_disciplines_level ON disciplines(level);

-- Example hierarchy:
-- Level 0: Sciences (broad field)
-- Level 1: Computer Science (discipline)
-- Level 2: Artificial Intelligence (sub-discipline)
-- Level 3: Machine Learning (specialization area)
```

### 7. **INSTITUTION_PARTNERSHIPS** (NEW - International collaborations)

```sql
CREATE TYPE partnership_type AS ENUM (
    'exchange_program',
    'joint_degree',
    'research_collaboration',
    'co_tutelle',
    'franchise',
    'accreditation',
    'other'
);

CREATE TABLE institution_partnerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    partner_institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    partner_institution_name VARCHAR(255),  -- If external/foreign
    partner_country VARCHAR(100),
    
    partnership_type partnership_type NOT NULL,
    
    description TEXT,
    start_date DATE,
    end_date DATE,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_partnerships_institution ON institution_partnerships(institution_id);
CREATE INDEX idx_partnerships_type ON institution_partnerships(partnership_type);
```

---

## 🔄 MIGRATION STRATEGY

### Step 1: Create New Tables
1. Create `institutions` (migrate from `universities` + add others)
2. Create `institution_campuses`
3. Create `organizational_units` (consolidate `faculties`, `schools`, `departments`)
4. Create `disciplines` (rename from `categories`)
5. Create `study_programs`
6. Create `specializations`
7. Create `institution_partnerships`

### Step 2: Data Migration

```sql
-- Migrate universities to institutions
INSERT INTO institutions (
    id, name_en, name_fr, name_ar, acronym,
    institution_type, ownership_type,
    geographic_entity_id, founded_year, is_active,
    created_at, updated_at
)
SELECT 
    id, name_en, name_fr, name_ar, acronym,
    'public_university', 'public',
    geographic_entities_id, NULL, true,
    created_at, updated_at
FROM universities;

-- Migrate faculties to organizational_units
INSERT INTO organizational_units (
    id, institution_id, name_en, name_fr, name_ar, acronym,
    unit_type, hierarchy_level, is_active,
    created_at, updated_at
)
SELECT 
    id, university_id, name_en, name_fr, name_ar, acronym,
    'faculty', 1, is_active,
    created_at, updated_at
FROM faculties;

-- Migrate schools to organizational_units
INSERT INTO organizational_units (
    id, institution_id, parent_unit_id,
    name_en, name_fr, name_ar, acronym,
    unit_type, hierarchy_level, is_active,
    created_at, updated_at
)
SELECT 
    id, 
    COALESCE(parent_university_id, id), 
    parent_school_id,
    name_en, name_fr, name_ar, acronym,
    'school', 
    CASE WHEN parent_school_id IS NULL THEN 1 ELSE 2 END,
    is_active,
    created_at, updated_at
FROM schools;

-- Migrate departments to organizational_units
INSERT INTO organizational_units (
    id, institution_id, parent_unit_id,
    name_en, name_fr, name_ar, acronym,
    unit_type, hierarchy_level, is_active,
    created_at, updated_at
)
SELECT 
    d.id,
    COALESCE(f.university_id, s.parent_university_id),
    COALESCE(d.faculty_id, d.school_id),
    d.name_en, d.name_fr, d.name_ar, d.acronym,
    'department', 2, d.is_active,
    d.created_at, d.updated_at
FROM departments d
LEFT JOIN faculties f ON d.faculty_id = f.id
LEFT JOIN schools s ON d.school_id = s.id;

-- Rename categories to disciplines
ALTER TABLE categories RENAME TO disciplines;
```

### Step 3: Update Foreign Keys in Theses

```sql
-- Add new columns
ALTER TABLE theses
    ADD COLUMN study_program_id UUID REFERENCES study_programs(id),
    ADD COLUMN specialization_id UUID REFERENCES specializations(id);

-- Keep old columns for transition period, mark as deprecated
-- After full migration, can drop: faculty_id, school_id, department_id
```

---

## 📊 COMPARISON: OLD vs NEW

| Aspect | OLD Structure | NEW Structure |
|--------|---------------|---------------|
| **Institutions** | Only universities | All types (universities, écoles, institutes, private) |
| **Hierarchy** | Confusing (schools under schools) | Clear levels (institution → unit → department) |
| **Private Sector** | ❌ Not supported | ✅ Fully supported |
| **Grandes Écoles** | ❌ Ambiguous | ✅ Proper classification |
| **Multi-campus** | ❌ Not supported | ✅ Full support |
| **Programs** | ❌ No separation | ✅ Clear: organizational vs academic |
| **Disciplines** | "Categories" (unclear) | "Disciplines" (clear purpose) |
| **Partnerships** | ❌ Not supported | ✅ Full support |
| **Metadata** | Basic | Comprehensive (accreditation, founding, etc.) |

---

## 🎯 BENEFITS

### 1. **Clarity**
- Clear distinction between institution types
- Organizational structure separate from academic programs
- Proper hierarchy levels

### 2. **Flexibility**
- Supports all Moroccan institutional types
- Can handle complex hierarchies
- Multi-campus support
- International partnerships

### 3. **Accuracy**
- Matches real-world structure
- Proper modeling of Grandes Écoles
- Private sector fully supported

### 4. **Scalability**
- Easy to add new institution types
- Can expand to other countries
- Supports institutional networks/groups

### 5. **Better Analytics**
- Rankings by institution type
- Statistics by ownership
- Program-level analytics
- Geographic distribution

