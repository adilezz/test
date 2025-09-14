1. Core Academic Structure (11 tables)

    1. universities

        CREATE TABLE universities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name_en VARCHAR(255),
            name_fr VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255) NOT NULL,
            acronym VARCHAR(20),
            official_code VARCHAR(50) UNIQUE, -- Official government code
            university_type VARCHAR(50) DEFAULT 'public',

            -- Leadership
            head_name VARCHAR(255),
            deputy_head_name VARCHAR(255),

            -- Location information
            location_id UUID NOT NULL REFERENCES geographic_entities(id),
            address_fr VARCHAR(255),
            address_ar VARCHAR(255),

            -- Contact information
            website VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),

            -- Administrative details
            established_year INTEGER,
            logo_url VARCHAR(500),

            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,

            -- Statistics (updated periodically)
            student_count INTEGER DEFAULT 0,
            faculty_count INTEGER DEFAULT 0,
            thesis_count INTEGER DEFAULT 0,

            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );


    2. faculties

        CREATE TABLE faculties (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,

            -- Names and identification
            name_en VARCHAR(255),
            name_fr VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255) NOT NULL,
            acronym VARCHAR(20),
            official_code VARCHAR(50), -- Faculty code within university

            -- Leadership
            head_name VARCHAR(255),
            deputy_head_name VARCHAR(255),

            -- Location information
            location_id UUID REFERENCES geographic_entities(id),
            address_fr VARCHAR(255),
            address_ar VARCHAR(255),

            -- Contact information
            website VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),

            -- administrative details
            established_year INTEGER,
            academic_fields TEXT[], -- Array of main academic areas
            logo_url VARCHAR(500),

            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,

            -- Statistics (updated periodically)
            student_count INTEGER DEFAULT 0,
            staff_count INTEGER DEFAULT 0,
            department_count INTEGER DEFAULT 0,
            thesis_count INTEGER DEFAULT 0,

            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );


    3. schools

        CREATE TABLE schools (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            -- Core identification
            name_en VARCHAR(500), -- English name
            name_fr VARCHAR(500) NOT NULL, -- French name  
            name_ar VARCHAR(500) NOT NULL, -- Arabic name

            -- School classification and type
            school_type VARCHAR(50) NOT NULL, -- professional_school, technical_institute, community_college, etc.
            school_subtype VARCHAR(50), -- medical_school, business_school, art_school, etc.
            institutional_category VARCHAR(50), -- independent, university_affiliated, corporate, government

            -- Hierarchical relationships
            parent_university_id UUID REFERENCES universities(id), -- Parent university if applicable
            parent_school_id UUID REFERENCES schools(id), -- Parent school if nested

            -- Academic credentials and accreditation
            degree_type TEXT, -- Degree levels offered
            accreditation_status TEXT, -- accredited, provisional, not_accredited

            -- Location information
            location_id UUID NOT NULL REFERENCES geographic_entities(id),
            address_fr VARCHAR(255),
            address_ar VARCHAR(255),

            -- Contact information
            website VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),

            -- Administrative details
            established_year INTEGER,
            logo_url VARCHAR(500),

            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,

            -- Statistics (updated periodically)
            student_count INTEGER DEFAULT 0,
            faculty_count INTEGER DEFAULT 0,
            thesis_count INTEGER DEFAULT 0,

            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE, -- Data has been verified
            is_featured BOOLEAN DEFAULT FALSE, -- Featured school

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_enrollment_update TIMESTAMP, -- Last enrollment data update
        );


    4. departments

        CREATE TABLE departments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
            school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE;

            -- Names and identification
            name_en VARCHAR(255),
            name_fr VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255),
            acronym VARCHAR(20),
            official_code VARCHAR(50), -- Department code within faculty

            -- Leadership
            head_name VARCHAR(255),
            deputy_head_name VARCHAR(255),

            -- Contact information
            website VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),

            -- Academic information
            established_year INTEGER,
            specializations TEXT[], -- Array of department specializations
            degree_type TEXT[], -- licence, master, phd

            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,

            -- Research areas
            research_keywords TEXT[],
            research_description TEXT,

            -- Statistics (updated periodically)
            student_count INTEGER DEFAULT 0,
            faculty_member_count INTEGER DEFAULT 0,
            thesis_count INTEGER DEFAULT 0,
            publication_count INTEGER DEFAULT 0,

            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );

    
    5. academic_persons

        CREATE TABLE academic_persons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            -- Personal information (multilingual names)
            first_name_fr VARCHAR(100),
            last_name_fr VARCHAR(100),
            first_name_ar VARCHAR(100),
            last_name_ar VARCHAR(100),

            title VARCHAR(50), -- Dr., Prof., PhD, HDR, etc.

            -- Contact information
            email VARCHAR(255),
            phone VARCHAR(50),
            alternative_email VARCHAR(255),

            -- Institutional affiliation
            university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
            faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
            school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
            department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

            -- External institution (for external jury members, co-supervisors)
            external_institution_name VARCHAR(255),
            external_institution_country VARCHAR(100),
            external_institution_type VARCHAR(50),

            -- Academic information
            position VARCHAR(100),
            specialization VARCHAR(255),
            research_areas TEXT[],
            academic_rank VARCHAR(50),

            -- Research profiles
            orcid VARCHAR(50),
            google_scholar_id VARCHAR(100),
            researchgate_url VARCHAR(255),
            linkedin_url VARCHAR(255),
            personal_website VARCHAR(255),

            -- Professional details
            bio_en TEXT,
            bio_fr TEXT,
            bio_ar TEXT,
            profile_picture_url VARCHAR(500),

            -- Statistics
            supervised_thesis_count INTEGER DEFAULT 0,
            jury_participation_count INTEGER DEFAULT 0,
            publication_count INTEGER DEFAULT 0,
            citation_count INTEGER DEFAULT 0,
            h_index INTEGER DEFAULT 0,

            -- Platform connection
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,

            -- Data quality
            is_verified BOOLEAN DEFAULT FALSE,
            verification_source VARCHAR(100),

            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_deceased BOOLEAN DEFAULT FALSE,
            retirement_date DATE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP,
        );


    6. languages

        CREATE TABLE languages (
            code VARCHAR(5) PRIMARY KEY, 
            name VARCHAR(100) NOT NULL,
            native_name VARCHAR(100) NOT NULL,
            rtl BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        -- Insert default languages for Morocco
        INSERT INTO languages (code, name, native_name, rtl, is_active, display_order) VALUES
        ('zgh', 'Tamazight', 'ⵜⴰⵎⴰⵣⵉⵖⵜ', FALSE, TRUE, A);
        ('ar', 'Arabic', 'العربية', TRUE, TRUE, 2),
        ('fr', 'French', 'Français', FALSE, TRUE, 3),
        ('en', 'English', 'English', FALSE, TRUE, 4);
        ('es', 'Spanish', 'español', FALSE, TRUE, 5);


    7. geographic_entities

        CREATE TABLE geographic_entities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name_en VARCHAR(100),
            name_fr VARCHAR(100) NOT NULL,
            name_ar VARCHAR(100),
            parent_id NOT NULL UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
            level VARCHAR(50) NOT NULL, 
            code VARCHAR(20) UNIQUE,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );
    -- Insert Morocco as root country
    INSERT INTO geographic_entities (name_en, name_fr, name_ar, level, code) VALUES
    ('Morocco', 'Maroc', 'المغرب', 'pays', 'MA');
      

    8. categories

        CREATE TABLE categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Hierarchical structure
            parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
            level INTEGER DEFAULT 0, -- 0=root, 1=discipline, 2=subdiscipline, 3=specialization
            
            -- Classification codes
            code VARCHAR(50) UNIQUE NOT NULL, -- Official classification code (e.g., "CS", "CS.AI", "CS.AI.ML")
            unesco_code VARCHAR(20), -- UNESCO classification if applicable
            dewey_code VARCHAR(20), -- Dewey decimal if applicable
            
            -- Multilingual names
            name_en VARCHAR(255),
            name_fr VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255),
            
            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,
            
            -- Keywords and synonyms
            keywords TEXT[], -- Related keywords for better search
            synonyms TEXT[], -- Alternative names
            
            -- Visual representation
            icon VARCHAR(100), -- Icon class or URL
            
            -- Ordering and display
            display_order INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT FALSE, -- For homepage/dashboard display
            
            -- Statistics (updated periodically)
            thesis_count INTEGER DEFAULT 0,
            direct_children_count INTEGER DEFAULT 0,
            total_descendants_count INTEGER DEFAULT 0,
            
            -- Status and quality
            is_active BOOLEAN DEFAULT TRUE,
            is_approved BOOLEAN DEFAULT TRUE, -- For admin-approved categories
            suggested_by UUID REFERENCES users(id), -- If user-suggested
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by UUID REFERENCES users(id),
        ),


    9. study_designs

        CREATE TABLE study_designs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Hierarchical structure
            parent_id UUID REFERENCES study_designs(id) ON DELETE SET NULL,
            level INTEGER DEFAULT 0, -- 0=root, 1=main type, 2=subtype, 3=specific method
            
            -- Classification
            code VARCHAR(50) UNIQUE, -- e.g., "OBS", "OBS.DESC", "OBS.DESC.CROSS"
            
            -- Multilingual names
            name_en VARCHAR(100),
            name_fr VARCHAR(100) NOT NULL,
            name_ar VARCHAR(100),
            
            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,
            
            -- Methodology details
            methodology_en TEXT, -- How to conduct this type of study
            methodology_fr TEXT,
            methodology_ar TEXT,
            
            -- Study characteristics
            typical_duration VARCHAR(50), -- e.g., "1-2 years", "longitudinal", "snapshot"
            data_collection_methods TEXT[], -- survey, interview, observation, experiment
            statistical_methods TEXT[], -- descriptive, inferential, regression, etc.
                        
            -- Academic fields where commonly used
            common_fields TEXT[], -- medicine, psychology, sociology, etc.
            
            -- Visual representation
            icon VARCHAR(100), -- Icon for UI display
            
            -- Ordering and display
            display_order INTEGER DEFAULT 0,
            is_featured BOOLEAN DEFAULT FALSE,
            
            -- Statistics (updated periodically)
            thesis_count INTEGER DEFAULT 0,
            direct_children_count INTEGER DEFAULT 0,
            total_descendants_count INTEGER DEFAULT 0,
            
            -- Status and quality
            is_active BOOLEAN DEFAULT TRUE,
            is_approved BOOLEAN DEFAULT TRUE,
            created_by UUID REFERENCES users(id),
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by UUID REFERENCES users(id),
        );


    10. keywords

        CREATE TABLE keywords (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Hierarchical structure (optional)
            parent_keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
            
            -- Multilingual keywords
            keyword_en VARCHAR(200) UNIQUE,
            keyword_fr VARCHAR(200) UNIQUE NOT NULL,
            keyword_ar VARCHAR(200) UNIQUE,
            
            -- Alternative forms
            synonyms TEXT[], -- Alternative terms: ['AI', 'Artificial Intelligence', 'Machine Intelligence']
            abbreviations TEXT[], -- ['ML', 'DL', 'NLP']
            translations TEXT[], -- Cross-language variations
            
            -- Descriptions
            description_en TEXT,
            description_fr TEXT,
            description_ar TEXT,
            
            -- Classification
            category_id UUID REFERENCES categories(id), -- Related academic discipline
            
            -- Related information
            wikipedia_url VARCHAR(500),
            external_links TEXT[], -- Array of related URLs
            related_keywords UUID[], -- Array of related keyword_en IDs
            
            -- Usage statistics
            usage_count INTEGER DEFAULT 0,
            thesis_count INTEGER DEFAULT 0,
            search_count INTEGER DEFAULT 0,
            last_used TIMESTAMP,
            
            -- Trending information
            monthly_usage INTEGER DEFAULT 0,
            yearly_usage INTEGER DEFAULT 0,
            trend_score DECIMAL(5,2) DEFAULT 0, -- Calculated trending score
            
            -- Quality and approval
            is_approved BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE, -- Popular/important keywords
            confidence_score DECIMAL(3,2) DEFAULT 1.0, -- Auto-extraction confidence
            
            -- Source tracking
            created_by UUID REFERENCES users(id),
            suggested_by UUID REFERENCES users(id), -- If user-suggested
            source VARCHAR(50) DEFAULT 'extracted', -- manual, extracted, imported, suggested
            
            -- Language and context
            primary_language VARCHAR(5) REFERENCES languages(code),
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_deprecated BOOLEAN DEFAULT FALSE,
            deprecated_reason TEXT,
            replacement_keyword_id UUID REFERENCES keywords(id), -- If deprecated, point to replacement
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by UUID REFERENCES users(id),
        );


    11. degrees

        CREATE TABLE degrees (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name_en VARCHAR(255) NOT NULL,
            name_fr VARCHAR(255) NOT NULL,
            name_ar VARCHAR(255) NOT NULL,
            abbreviation VARCHAR(20) NOT NULL, -- PhD, MD, MBA, etc.
            type VARCHAR(50) NOT NULL, -- academic, professional, honorary, research, coursework
            category VARCHAR(50), -- science, arts, engineering, medicine, business, law, etc.
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        )    


2. Thesis Management System (12 tables)

    1. theses

        CREATE TABLE theses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Basic thesis information
            title_en VARCHAR(500),
            title_fr VARCHAR(500) NOT NULL,
            title_ar VARCHAR(500),
            
            -- Abstracts
            abstract_en TEXT,
            abstract_fr TEXT NOT NULL,
            abstract_ar TEXT,
            
            -- Author and institutional affiliations
            author_id NOT NULL UUID REFERENCES users(id) ON DELETE SET NULL,
            university_id NOT NULL UUID REFERENCES universities(id) ON DELETE SET NULL,
            faculty_id NOT NULL UUID REFERENCES faculties(id) ON DELETE SET NULL,
            school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
            department_id UUID REFERENCES departments(id) ON DELETE SET NULL,

            -- Academic persons
            director_id NOT NULL UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            co_director_id UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            jury_president_id NOT NULL UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            jury_reporter_id NOT NULL UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            jury_examiner_id NOT NULL UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            jury_examiner_id UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            jury_examiner_id UUID REFERENCES academic_persons(id) ON DELETE SET NULL,
            external_examiner_id UUID REFERENCES academic_persons(id) ON DELETE SET NULL,

            -- Academic classification
            category_id UUID REFERENCES categories(id),
            study_design_id UUID REFERENCES study_designs(id),
            degree_id UUID REFERENCES degrees(id),
            academic_level VARCHAR(50),
            thesis_number VARCHAR(100), faculty's internal ID
            
            -- Geographic information
            study_location_id UUID REFERENCES geographic_entities(id), 
            
            -- Academic dates
            defense_date NOT NULL DATE,
            submission_date DATE,
            publication_date DATE,
            embargo_until DATE,

            -- Language and content details
            language VARCHAR(20) NOT NULL REFERENCES languages(name),
            secondary_languages VARCHAR(5)[] DEFAULT '{}', -- Additional languages if multilingual thesis
            page_count INTEGER,
            word_count INTEGER,
            
            -- File information
            file_url VARCHAR(500) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size BIGINT,
            file_hash VARCHAR(64), -- SHA-256 hash for integrity
            thumbnail_url VARCHAR(500), -- Thesis cover/first page thumbnail
            
            
            -- Statistics (updated periodically)
            view_count INTEGER DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            citation_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            favorite_count INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            
            -- Quality scores
            completeness_score DECIMAL(3,2) DEFAULT 0, -- How complete is the metadata (0-1)
            quality_score DECIMAL(3,2) DEFAULT 0, -- Overall quality assessment
            
            -- Processing and approval workflow
            status VARCHAR(50) DEFAULT 'draft',
            user_status VARCHAR(50) DEFAULT 'draft', -- User-facing status
            submission_type VARCHAR(50) DEFAULT 'manual', -- manual, bulk_upload, extracted
            
            -- Approval workflow
            submitted_at TIMESTAMP,
            reviewed_at TIMESTAMP,
            approved_at TIMESTAMP,
            approved_by UUID REFERENCES users(id),
            rejection_reason TEXT,
            
            -- Data extraction
            extraction_job_id UUID, -- Will reference extraction_jobs table later
            data_source VARCHAR(50) DEFAULT 'manual', -- manual, extracted, imported, migrated
            metadata_confidence JSONB DEFAULT '{}', -- Confidence scores for extracted fields
            
            -- Document content (unstructured)
            document_content JSONB, -- Chapters, figures, tables, references
            
            -- Access control
            access_level VARCHAR(20) DEFAULT 'public', -- public, institution, restricted, private
            download_restrictions TEXT[],
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published_at TIMESTAMP,
            last_accessed TIMESTAMP,
        );


    2. thesis_files



    3. thesis_authors



    4. thesis_academic_roles

        CREATE TABLE thesis_academic_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Primary relationship
            thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
            person_id UUID NOT NULL REFERENCES academic_persons(id) ON DELETE RESTRICT,
            
            -- Role information
            role VARCHAR(50) NOT NULL, -- director, co_director, jury_president, jury_examiner, jury_reporter, external_examiner
            
            -- Institutional context
            role_institution_id UUID REFERENCES universities(id), -- Institution at time of role (may differ from person's current)
            is_external BOOLEAN DEFAULT FALSE, -- Is this an external examiner/supervisor
            external_institution_name VARCHAR(255), -- External institution if applicable
            
            -- Expertise and contribution
            expertise_area VARCHAR(255), -- Their area of expertise relevant to this thesis
            contribution_type VARCHAR(100), -- supervision, methodology, analysis, review, examination
            specialization_relevance DECIMAL(3,2) DEFAULT 1.00, -- How relevant their specialization is (0.01-1.00)
            
            -- Status and approval
            approved_by UUID REFERENCES users(id),
            approved_at TIMESTAMP,
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );


    5. thesis_keywords

        CREATE TABLE thesis_keywords (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Primary relationship
            thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
            keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
            
            -- Relationship metadata
            is_primary BOOLEAN DEFAULT FALSE, -- Is this a primary/main keyword for the thesis
            is_auto_generated BOOLEAN DEFAULT FALSE, -- Was this added automatically or manually
            
            -- Source tracking
            added_by UUID REFERENCES users(id), -- Who added this keyword
            
            -- Position and context
            keyword_position INTEGER, -- Order of importance (1=most important)
            frequency_count INTEGER DEFAULT 0, -- How many times keyword appears in document
            
            -- Approval workflow
            reviewed_by UUID REFERENCES users(id),
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,            
        );


    6. thesis_categories

        CREATE TABLE thesis_categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Primary relationship
            thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
            category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
            
            -- Relationship metadata
            is_primary BOOLEAN DEFAULT FALSE, -- Is this the main discipline for the thesis
            relevance_score DECIMAL(3,2) DEFAULT 1.00, -- How relevant is this category (0.01-1.00)
            classification_level VARCHAR(20) DEFAULT 'automatic', -- automatic, manual, reviewed
            
            -- Source tracking
            added_by UUID REFERENCES users(id), -- Who classified this thesis
            classification_method VARCHAR(50) DEFAULT 'manual', -- manual, ai_classification, keyword_mapping, admin_assigned
            classification_confidence DECIMAL(3,2), -- Confidence if auto-classified (0.01-1.00)
            
            -- Approval workflow for auto-classifications
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP,
            
            -- Position and priority
            category_priority INTEGER, -- Order of importance (1=most important discipline)
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );


    7. thesis_citations



    8. thesis_collections



    9. thesis_collection_items



    10. thesis_versions



    11. thesis_metrics

        CREATE TABLE thesis_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Primary relationship
            thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
            
            -- Time period
            metric_date DATE NOT NULL,
            metric_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly, yearly
            
            -- Core engagement metrics
            view_count INTEGER DEFAULT 0,
            unique_view_count INTEGER DEFAULT 0, -- Unique users who viewed
            download_count INTEGER DEFAULT 0,
            unique_download_count INTEGER DEFAULT 0, -- Unique users who downloaded
            
            -- Social engagement
            favorite_count INTEGER DEFAULT 0,
            share_count INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            comment_reply_count INTEGER DEFAULT 0,
            
            -- Citation and research impact
            citation_count INTEGER DEFAULT 0,
            external_citation_count INTEGER DEFAULT 0, -- Citations from external sources
            self_citation_count INTEGER DEFAULT 0,
            publication_derived_count INTEGER DEFAULT 0, -- Publications derived from this thesis
            
            -- Search and discovery
            search_appearance_count INTEGER DEFAULT 0, -- How many times appeared in search results
            search_click_count INTEGER DEFAULT 0, -- How many times clicked from search
            search_ctr DECIMAL(5,4) DEFAULT 0, -- Click-through rate from search (0-1)
            
            -- Geographic metrics
            view_countries TEXT[], -- Countries where thesis was viewed
            download_countries TEXT[], -- Countries where thesis was downloaded
            top_viewing_country VARCHAR(100),
            
            -- User type breakdown
            student_views INTEGER DEFAULT 0,
            faculty_views INTEGER DEFAULT 0,
            researcher_views INTEGER DEFAULT 0,
            public_views INTEGER DEFAULT 0, -- Non-registered users
            
            -- Device and access metrics
            mobile_views INTEGER DEFAULT 0,
            desktop_views INTEGER DEFAULT 0,
            tablet_views INTEGER DEFAULT 0,
            pdf_downloads INTEGER DEFAULT 0,
            online_reads INTEGER DEFAULT 0, -- Read online without downloading
            
            -- Time-based metrics
            avg_view_duration_seconds INTEGER DEFAULT 0,
            bounce_rate DECIMAL(5,4) DEFAULT 0, -- Users who left immediately (0-1)
            pages_viewed_avg DECIMAL(5,2) DEFAULT 0, -- For multi-page viewing
            
            -- Referral sources
            direct_visits INTEGER DEFAULT 0,
            search_engine_visits INTEGER DEFAULT 0,
            social_media_visits INTEGER DEFAULT 0,
            referral_visits INTEGER DEFAULT 0,
            top_referral_source VARCHAR(255),
            
            -- Quality indicators
            completion_rate DECIMAL(5,4) DEFAULT 0, -- How many finished reading (0-1)
            return_visitor_count INTEGER DEFAULT 0, -- Users who came back
            recommendation_clicks INTEGER DEFAULT 0, -- Clicks on related theses
            
            -- Comparative metrics
            rank_in_category INTEGER, -- Rank within its primary category
            rank_in_university INTEGER, -- Rank within its university
            rank_in_year INTEGER, -- Rank among theses from same year
            percentile_score DECIMAL(5,2), -- Overall percentile (0-100)
            
            -- Trending indicators
            trend_score DECIMAL(8,4) DEFAULT 0, -- Algorithm-calculated trending score
            velocity_change DECIMAL(8,4) DEFAULT 0, -- Rate of change in popularity
            momentum_score DECIMAL(8,4) DEFAULT 0, -- Sustained interest score
            
            -- Cumulative totals (for performance)
            cumulative_views INTEGER DEFAULT 0,
            cumulative_downloads INTEGER DEFAULT 0,
            cumulative_citations INTEGER DEFAULT 0,
            cumulative_favorites INTEGER DEFAULT 0,
            
            -- Data quality and processing
            is_processed BOOLEAN DEFAULT FALSE,
            processing_date TIMESTAMP,
            data_source VARCHAR(50) DEFAULT 'system', -- system, imported, calculated, estimated
            confidence_score DECIMAL(3,2) DEFAULT 1.00, -- Data confidence (0.01-1.00)
            
            -- Additional context
            notable_events TEXT[], -- Special events affecting metrics (conference mention, media coverage)
            seasonal_factor DECIMAL(3,2) DEFAULT 1.00, -- Seasonal adjustment factor
            
            -- Status
            is_active BOOLEAN DEFAULT TRUE,
            is_anomaly BOOLEAN DEFAULT FALSE, -- Flagged as unusual activity
            anomaly_reason TEXT,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );


    12. thesis_publication

    
    13. thesis_metadata_log



3. User Management & Authentication (9 tables)

    1. user_roles

        CREATE TABLE user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Core role identification
            role_name VARCHAR(50) UNIQUE NOT NULL, -- user, moderator, admin, super_admin
            role_code VARCHAR(20) UNIQUE NOT NULL, -- USR, MOD, ADM, SUP
            
            -- Role description
            description TEXT NOT NULL, --
            
            -- Role hierarchy (simple 1-4 levels)
            role_level INTEGER NOT NULL, -- 1=user, 2=moderator, 3=admin, 4=super_admin
            hierarchy_position INTEGER NOT NULL, -- Position in access hierarchy
            
            -- Batch operation limits
            thesis_import_limit INTEGER DEFAULT 1, -- Max theses per batch
            file_size_limit_mb INTEGER DEFAULT 50, -- Max file size per operation
            batch_size_limit_mb INTEGER DEFAULT 10, -- Max total batch size
            
            -- Core capabilities flags
            can_manage_own_account BOOLEAN DEFAULT TRUE,
            can_import_thesis BOOLEAN DEFAULT TRUE,
            can_interact_content BOOLEAN DEFAULT TRUE, -- comment, cite, download, favorite, report
            can_moderate_comments BOOLEAN DEFAULT FALSE,
            can_report_profiles BOOLEAN DEFAULT FALSE,
            can_suggest_items BOOLEAN DEFAULT FALSE,
            can_manage_users BOOLEAN DEFAULT FALSE,
            can_manage_content BOOLEAN DEFAULT FALSE,
            can_manage_system_data BOOLEAN DEFAULT FALSE,
            can_manage_all BOOLEAN DEFAULT FALSE,
            
            -- Approval requirements
            requires_approval_for_thesis BOOLEAN DEFAULT TRUE, -- Thesis imports need approval
            can_approve_thesis BOOLEAN DEFAULT FALSE, -- Can approve others' thesis
            can_bypass_approval BOOLEAN DEFAULT FALSE, -- Can skip approval process
            
            -- Status and timestamps
            is_active BOOLEAN DEFAULT TRUE,
            is_system_role BOOLEAN DEFAULT TRUE, -- These are fixed system roles
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );

        -- Insert the 4 system roles
        INSERT INTO user_roles (role_name, role_code, display_name, description, role_level, hierarchy_position, 
            thesis_import_limit, file_size_limit_mb, batch_size_limit_mb, 
            can_moderate_comments, can_report_profiles, can_suggest_items, can_manage_users, 
            can_manage_content, can_manage_system_data, can_manage_all, requires_approval_for_thesis, 
            can_approve_thesis, can_bypass_approval) VALUES
            
        ('user', 'USR', 'User', 'Regular user with basic access rights', 1, 1, 
            1, 10, 10, 
            FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE),
            
        ('moderator', 'MOD', 'Moderator', 'Content moderator with enhanced privileges', 2, 2, 
            10, 10, 100, 
            TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, TRUE, TRUE, FALSE),
            
        ('admin', 'ADM', 'Administrator', 'System administrator with management access', 3, 3, 
            100, 50, 500, 
            TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE),
            
        ('super_admin', 'SUP', 'Super Administrator', 'Full system access and control', 4, 4, 
            1000, 100, 1000, 
            TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE);


    2. user_permissions

        CREATE TABLE user_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Core permission identification
            permission_name VARCHAR(100) UNIQUE NOT NULL, -- 'theses.create', 'users.update'
            resource_type VARCHAR(50) NOT NULL, -- 'theses', 'users', 'universities'
            operation VARCHAR(20) NOT NULL, -- 'create', 'read', 'update', 'delete'
            
            -- Permission details
            display_name VARCHAR(255) NOT NULL, -- 'Create New Theses'
            display_name_fr VARCHAR(255), -- French display name
            display_name_ar VARCHAR(255), -- Arabic display name
            description TEXT, -- What this permission allows
            description_fr TEXT, -- French description
            description_ar TEXT, -- Arabic description
            
            -- Permission scope and context
            scope_level VARCHAR(30) DEFAULT 'global', -- global, institutional, departmental, own
            requires_ownership BOOLEAN DEFAULT FALSE, -- Only on own resources
            requires_approval BOOLEAN DEFAULT FALSE, -- Action needs approval
            approval_level VARCHAR(30), -- moderator, admin, super_admin
            
            -- Operation characteristics
            is_batch_operation BOOLEAN DEFAULT FALSE, -- Supports batch operations
            is_bulk_operation BOOLEAN DEFAULT FALSE, -- Supports bulk operations
            is_admin_only BOOLEAN DEFAULT FALSE, -- Admin-level permission
            is_system_critical BOOLEAN DEFAULT FALSE, -- Critical system permission
            is_destructive BOOLEAN DEFAULT FALSE, -- Destructive operation (delete, etc.)
            
            -- Access and security levels
            security_level INTEGER DEFAULT 1, -- Security level required (1-10)
            risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
            audit_required BOOLEAN DEFAULT FALSE, -- Requires audit logging
            two_factor_required BOOLEAN DEFAULT FALSE, -- Requires 2FA
            
            -- Constraints and limits
            max_records_per_operation INTEGER, -- Max records per operation
            max_file_size_mb INTEGER, -- Max file size for uploads
            max_batch_size_mb INTEGER, -- Max total batch size
            rate_limit_per_hour INTEGER, -- Rate limiting
            
            -- Business rules and conditions
            business_hours_only BOOLEAN DEFAULT FALSE, -- Only during business hours
            ip_restrictions_apply BOOLEAN DEFAULT FALSE, -- IP restrictions apply
            geographic_restrictions TEXT[], -- Geographic limitations
            additional_restrictions JSONB DEFAULT '{}', -- Additional rules
            
            -- Permission categories and grouping
            permission_category VARCHAR(50), -- user_management, content_management, system_admin
            permission_group VARCHAR(50), -- Related permissions group
            feature_flag VARCHAR(100), -- Feature flag that controls this permission
            
            -- Dependencies and relationships
            depends_on_permissions UUID[], -- Prerequisite permissions
            conflicts_with_permissions UUID[], -- Conflicting permissions
            implies_permissions UUID[], -- Permissions automatically granted with this one
            
            -- Usage analytics
            usage_frequency INTEGER DEFAULT 0, -- How often this permission is used
            last_used_at TIMESTAMP, -- Last time this permission was used
            average_usage_per_day DECIMAL(8,2) DEFAULT 0, -- Average daily usage
            
            -- Status and lifecycle
            is_active BOOLEAN DEFAULT TRUE,
            is_deprecated BOOLEAN DEFAULT FALSE,
            deprecation_date DATE, -- When permission was deprecated
            replacement_permission_id UUID REFERENCES user_permissions(id),
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        );

        -- Junction table for role-permission assignments
        CREATE TABLE role_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
            permission_id UUID NOT NULL REFERENCES user_permissions(id) ON DELETE CASCADE,
            
            -- Assignment context
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by UUID REFERENCES users(id), -- Who granted this permission
            is_active BOOLEAN DEFAULT TRUE,
            
            -- Override settings for this role-permission combination
            custom_limits JSONB DEFAULT '{}', -- Custom limits for this role
            additional_restrictions JSONB DEFAULT '{}', -- Additional restrictions
            
            CONSTRAINT uk_role_permission UNIQUE(role_id, permission_id)
        );
        -- Now insert ALL permissions for our 38 tables
        INSERT INTO user_permissions (permission_name, resource_type, operation, display_name, description, 
            scope_level, security_level, permission_category, max_records_per_operation, is_batch_operation) VALUES

        -- CORE USER PERMISSIONS (all users)
        ('own_account.read', 'users', 'read', 'View Own Account', 'View own user account and profile', 'own', 1, 'user_management', 1, FALSE),
        ('own_account.update', 'users', 'update', 'Update Own Account', 'Update own user account and profile', 'own', 1, 'user_management', 1, FALSE),
        ('theses.read', 'theses', 'read', 'View Theses', 'View public theses in repository', 'global', 1, 'content_access', NULL, FALSE),
        ('comments.create', 'comments', 'create', 'Create Comments', 'Add comments to theses', 'global', 1, 'content_interaction', 10, FALSE),
        ('comments.read', 'comments', 'read', 'View Comments', 'View comments on theses', 'global', 1, 'content_interaction', NULL, FALSE),
        ('own_comments.update', 'comments', 'update', 'Edit Own Comments', 'Edit own comments', 'own', 1, 'content_interaction', 5, FALSE),
        ('own_comments.delete', 'comments', 'delete', 'Delete Own Comments', 'Delete own comments', 'own', 2, 'content_interaction', 5, TRUE),
        ('favorites.create', 'favorites', 'create', 'Add Favorites', 'Add theses to favorites', 'own', 1, 'content_interaction', 100, TRUE),
        ('favorites.read', 'favorites', 'read', 'View Favorites', 'View own favorite theses', 'own', 1, 'content_interaction', NULL, FALSE),
        ('favorites.update', 'favorites', 'update', 'Update Favorites', 'Update favorite thesis details', 'own', 1, 'content_interaction', 50, TRUE),
        ('favorites.delete', 'favorites', 'delete', 'Remove Favorites', 'Remove theses from favorites', 'own', 1, 'content_interaction', 50, TRUE),
        ('downloads.create', 'downloads', 'create', 'Download Theses', 'Download thesis files', 'global', 1, 'content_access', 20, FALSE),
        ('reports.create', 'reports', 'create', 'Report Content', 'Report inappropriate content', 'global', 1, 'content_moderation', 5, FALSE),
        ('theses.create', 'theses', 'create', 'Import Thesis', 'Import single thesis (requires approval)', 'own', 2, 'content_creation', 1, FALSE),

        -- MODERATOR PERMISSIONS
        ('comments.update', 'comments', 'update', 'Moderate Comments', 'Edit any comments', 'global', 3, 'content_moderation', 50, TRUE),
        ('comments.delete', 'comments', 'delete', 'Delete Comments', 'Delete inappropriate comments', 'global', 4, 'content_moderation', 20, TRUE),
        ('theses.batch_create', 'theses', 'create', 'Batch Import Theses', 'Import up to 10 theses at once', 'global', 3, 'content_creation', 10, TRUE),
        ('users.report', 'users', 'read', 'Report User Profiles', 'Report user profiles to admins', 'global', 3, 'content_moderation', 10, FALSE),
        ('suggestions.create', 'suggestions', 'create', 'Suggest Items', 'Suggest new universities, categories, etc.', 'global', 2, 'system_suggestions', 20, TRUE),
        ('reports.read', 'reports', 'read', 'View Reports', 'View content reports', 'global', 3, 'content_moderation', NULL, FALSE),
        ('reports.update', 'reports', 'update', 'Process Reports', 'Process and resolve content reports', 'global', 3, 'content_moderation', 50, TRUE),

        -- ADMIN PERMISSIONS (CRU on users, theses, system data)
        ('users.create', 'users', 'create', 'Create Users', 'Create new user accounts', 'global', 5, 'user_management', 20, TRUE),
        ('users.read', 'users', 'read', 'View All Users', 'View all user accounts', 'global', 4, 'user_management', NULL, FALSE),
        ('users.update', 'users', 'update', 'Update Users', 'Update any user account', 'global', 5, 'user_management', 50, TRUE),
        ('theses.update', 'theses', 'update', 'Update Theses', 'Update any thesis information', 'global', 4, 'content_management', 100, TRUE),
        ('theses.bulk_create', 'theses', 'create', 'Bulk Import Theses', 'Import up to 100 theses at once', 'global', 5, 'content_creation', 100, TRUE),

        -- System Data Management (CRU for admin)
        ('universities.create', 'universities', 'create', 'Create Universities', 'Add new universities', 'global', 5, 'system_data', 20, TRUE),
        ('universities.read', 'universities', 'read', 'View Universities', 'View university data', 'global', 2, 'system_data', NULL, FALSE),
        ('universities.update', 'universities', 'update', 'Update Universities', 'Update university information', 'global', 5, 'system_data', 50, TRUE),
        ('faculties.create', 'faculties', 'create', 'Create Faculties', 'Add new faculties', 'global', 5, 'system_data', 50, TRUE),
        ('faculties.read', 'faculties', 'read', 'View Faculties', 'View faculty data', 'global', 2, 'system_data', NULL, FALSE),
        ('faculties.update', 'faculties', 'update', 'Update Faculties', 'Update faculty information', 'global', 5, 'system_data', 100, TRUE),
        ('schools.create', 'schools', 'create', 'Create Schools', 'Add new schools', 'global', 5, 'system_data', 50, TRUE),
        ('schools.read', 'schools', 'read', 'View Schools', 'View school data', 'global', 2, 'system_data', NULL, FALSE),
        ('schools.update', 'schools', 'update', 'Update Schools', 'Update school information', 'global', 5, 'system_data', 100, TRUE),
        ('departments.create', 'departments', 'create', 'Create Departments', 'Add new departments', 'global', 5, 'system_data', 100, TRUE),
        ('departments.read', 'departments', 'read', 'View Departments', 'View department data', 'global', 2, 'system_data', NULL, FALSE),
        ('departments.update', 'departments', 'update', 'Update Departments', 'Update department information', 'global', 5, 'system_data', 200, TRUE),
        ('categories.create', 'categories', 'create', 'Create Categories', 'Add new thesis categories', 'global', 4, 'system_data', 100, TRUE),
        ('categories.read', 'categories', 'read', 'View Categories', 'View category data', 'global', 1, 'system_data', NULL, FALSE),
        ('categories.update', 'categories', 'update', 'Update Categories', 'Update category information', 'global', 4, 'system_data', 200, TRUE),
        ('keywords.create', 'keywords', 'create', 'Create Keywords', 'Add new keywords', 'global', 3, 'system_data', 500, TRUE),
        ('keywords.read', 'keywords', 'read', 'View Keywords', 'View keyword data', 'global', 1, 'system_data', NULL, FALSE),
        ('keywords.update', 'keywords', 'update', 'Update Keywords', 'Update keyword information', 'global', 3, 'system_data', 1000, TRUE),

        -- SUPER ADMIN PERMISSIONS (CRUD ALL TABLES)
        ('system.full_access', 'system', 'manage', 'Full System Access', 'Complete access to all system functions', 'global', 10, 'system_admin', NULL, TRUE),
        ('users.delete', 'users', 'delete', 'Delete Users', 'Delete user accounts', 'global', 8, 'user_management', 10, FALSE),
        ('theses.delete', 'theses', 'delete', 'Delete Theses', 'Delete theses from repository', 'global', 7, 'content_management', 50, TRUE),
        ('universities.delete', 'universities', 'delete', 'Delete Universities', 'Delete universities', 'global', 8, 'system_data', 5, FALSE),
        ('faculties.delete', 'faculties', 'delete', 'Delete Faculties', 'Delete faculties', 'global', 8, 'system_data', 10, FALSE),
        ('schools.delete', 'schools', 'delete', 'Delete Schools', 'Delete schools', 'global', 8, 'system_data', 10, FALSE),
        ('departments.delete', 'departments', 'delete', 'Delete Departments', 'Delete departments', 'global', 7, 'system_data', 20, TRUE),
        ('categories.delete', 'categories', 'delete', 'Delete Categories', 'Delete categories', 'global', 6, 'system_data', 50, TRUE),
        ('keywords.delete', 'keywords', 'delete', 'Delete Keywords', 'Delete keywords', 'global', 5, 'system_data', 100, TRUE),

        -- All other table permissions for super admin (CRUD)
        ('academic_persons.create', 'academic_persons', 'create', 'Create Academic Persons', 'Add academic persons', 'global', 5, 'system_data', 100, TRUE),
        ('academic_persons.read', 'academic_persons', 'read', 'View Academic Persons', 'View academic persons', 'global', 2, 'system_data', NULL, FALSE),
        ('academic_persons.update', 'academic_persons', 'update', 'Update Academic Persons', 'Update academic persons', 'global', 5, 'system_data', 200, TRUE),
        ('academic_persons.delete', 'academic_persons', 'delete', 'Delete Academic Persons', 'Delete academic persons', 'global', 7, 'system_data', 20, FALSE),

        ('languages.create', 'languages', 'create', 'Create Languages', 'Add new languages', 'global', 6, 'system_data', 10, FALSE),
        ('languages.read', 'languages', 'read', 'View Languages', 'View languages', 'global', 1, 'system_data', NULL, FALSE),
        ('languages.update', 'languages', 'update', 'Update Languages', 'Update languages', 'global', 6, 'system_data', 20, TRUE),
        ('languages.delete', 'languages', 'delete', 'Delete Languages', 'Delete languages', 'global', 8, 'system_data', 5, FALSE),

        ('geographic_entities.create', 'geographic_entities', 'create', 'Create Geographic Entities', 'Add geographic entities', 'global', 5, 'system_data', 100, TRUE),
        ('geographic_entities.read', 'geographic_entities', 'read', 'View Geographic Entities', 'View geographic entities', 'global', 1, 'system_data', NULL, FALSE),
        ('geographic_entities.update', 'geographic_entities', 'update', 'Update Geographic Entities', 'Update geographic entities', 'global', 5, 'system_data', 200, TRUE),
        ('geographic_entities.delete', 'geographic_entities', 'delete', 'Delete Geographic Entities', 'Delete geographic entities', 'global', 7, 'system_data', 50, TRUE),

        -- Continue with remaining system tables...
        ('study_designs.create', 'study_designs', 'create', 'Create Study Designs', 'Add study designs', 'global', 4, 'system_data', 50, TRUE),
        ('study_designs.read', 'study_designs', 'read', 'View Study Designs', 'View study designs', 'global', 1, 'system_data', NULL, FALSE),
        ('study_designs.update', 'study_designs', 'update', 'Update Study Designs', 'Update study designs', 'global', 4, 'system_data', 100, TRUE),
        ('study_designs.delete', 'study_designs', 'delete', 'Delete Study Designs', 'Delete study designs', 'global', 6, 'system_data', 20, FALSE);

        -- Now assign permissions to roles
        INSERT INTO role_permissions (role_id, permission_id) 
        SELECT r.id, p.id FROM user_roles r, user_permissions p WHERE

        -- USER ROLE PERMISSIONS
        (r.role_name = 'user' AND p.permission_name IN (
            'own_account.read', 'own_account.update', 'theses.read', 'comments.create', 'comments.read',
            'own_comments.update', 'own_comments.delete', 'favorites.create', 'favorites.read', 
            'favorites.update', 'favorites.delete', 'downloads.create', 'reports.create', 'theses.create'
        )) OR

        -- MODERATOR ROLE PERMISSIONS (includes all user permissions plus moderator-specific)
        (r.role_name = 'moderator' AND p.permission_name IN (
            'own_account.read', 'own_account.update', 'theses.read', 'comments.create', 'comments.read',
            'own_comments.update', 'own_comments.delete', 'favorites.create', 'favorites.read', 
            'favorites.update', 'favorites.delete', 'downloads.create', 'reports.create', 'theses.create',
            'comments.update', 'comments.delete', 'theses.batch_create', 'users.report', 'suggestions.create',
            'reports.read', 'reports.update'
        )) OR

        -- ADMIN ROLE PERMISSIONS (includes moderator permissions plus admin-specific)
        (r.role_name = 'admin' AND p.permission_name IN (
            'own_account.read', 'own_account.update', 'theses.read', 'comments.create', 'comments.read',
            'own_comments.update', 'own_comments.delete', 'favorites.create', 'favorites.read', 
            'favorites.update', 'favorites.delete', 'downloads.create', 'reports.create', 'theses.create',
            'comments.update', 'comments.delete', 'theses.batch_create', 'users.report', 'suggestions.create',
            'reports.read', 'reports.update', 'users.create', 'users.read', 'users.update', 'theses.update',
            'theses.bulk_create', 'universities.create', 'universities.read', 'universities.update',
            'faculties.create', 'faculties.read', 'faculties.update', 'schools.create', 'schools.read',
            'schools.update', 'departments.create', 'departments.read', 'departments.update',
            'categories.create', 'categories.read', 'categories.update', 'keywords.create', 'keywords.read',
            'keywords.update', 'academic_persons.create', 'academic_persons.read', 'academic_persons.update'
        )) OR

        -- SUPER ADMIN ROLE PERMISSIONS (all permissions)
        (r.role_name = 'super_admin' AND p.is_active = TRUE);

    3. user_relationships

        CREATE TABLE user_relationships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Core relationship participants
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The user initiating/owning relationship
            related_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The related user
            
            -- Relationship type and characteristics
            relationship_type VARCHAR(50) NOT NULL, -- follower, colleague, collaborator, supervisor, student, mentor, etc.
            relationship_subtype VARCHAR(50), -- research_partner, co_author, thesis_supervisor, etc.
            relationship_category VARCHAR(30) DEFAULT 'professional', -- professional, academic, personal, institutional
            
            -- Relationship direction and mutuality
            is_mutual BOOLEAN DEFAULT FALSE, -- Both users have confirmed the relationship
            is_bidirectional BOOLEAN DEFAULT TRUE, -- Relationship works both ways
            initiated_by_user_id UUID NOT NULL REFERENCES users(id), -- Who initiated the relationship
            requires_acceptance BOOLEAN DEFAULT TRUE, -- Needs approval from related user
            
            -- Relationship status and workflow
            relationship_status VARCHAR(30) DEFAULT 'pending', -- pending, active, blocked, suspended, ended
            acceptance_status VARCHAR(30) DEFAULT 'pending', -- pending, accepted, rejected, ignored
            accepted_at TIMESTAMP, -- When relationship was accepted
            accepted_by_user_id UUID REFERENCES users(id), -- Who accepted the relationship
            
            -- Academic and professional context
            institutional_relationship BOOLEAN DEFAULT FALSE, -- Same institution relationship
            academic_hierarchy_level INTEGER, -- Academic hierarchy (1=student, 2=postdoc, 3=faculty, etc.)
            professional_context VARCHAR(50), -- thesis_supervision, research_collaboration, peer_review, etc.
            collaboration_type VARCHAR(50), -- research, publication, project, course, conference
            
            -- Relationship strength and engagement
            relationship_strength INTEGER DEFAULT 1, -- 1-10 strength/closeness of relationship
            interaction_frequency VARCHAR(30) DEFAULT 'occasional', -- daily, weekly, monthly, occasional, rare
            last_interaction_date DATE, -- Last known interaction
            interaction_count INTEGER DEFAULT 0, -- Total interactions tracked
            collaboration_count INTEGER DEFAULT 0, -- Number of collaborations
            
            -- Privacy and visibility settings
            visibility_level VARCHAR(30) DEFAULT 'private', -- public, institutional, connections_only, private
            show_on_profile BOOLEAN DEFAULT FALSE, -- Display on user profile
            allow_contact_sharing BOOLEAN DEFAULT FALSE, -- Share contact info with related user
            allow_recommendation_sharing BOOLEAN DEFAULT TRUE, -- Share recommendations
            
            -- Academic collaboration details
            shared_publications_count INTEGER DEFAULT 0, -- Number of shared publications
            shared_theses_count INTEGER DEFAULT 0, -- Number of shared theses
            shared_projects_count INTEGER DEFAULT 0, -- Number of shared projects
            citation_relationship BOOLEAN DEFAULT FALSE, -- Users cite each other's work
            research_area_overlap DECIMAL(3,2) DEFAULT 0, -- Research area similarity (0-1)
            
            -- Supervision and mentorship context
            supervision_start_date DATE, -- If supervision relationship, when started
            supervision_end_date DATE, -- When supervision ended
            supervision_type VARCHAR(30), -- thesis, research, academic, professional
            mentorship_level VARCHAR(30), -- junior, senior, peer, expert
            supervision_status VARCHAR(30), -- active, completed, suspended, transferred
            
            -- Communication and contact preferences
            preferred_contact_method VARCHAR(30) DEFAULT 'platform', -- platform, email, phone, in_person
            communication_frequency VARCHAR(30) DEFAULT 'as_needed', -- daily, weekly, monthly, as_needed
            timezone_difference INTEGER, -- Hours difference in timezones
            language_preference VARCHAR(5) REFERENCES languages(code), -- Preferred communication language
            
            -- Trust and recommendation metrics
            trust_level INTEGER DEFAULT 5, -- 1-10 trust level
            recommendation_given BOOLEAN DEFAULT FALSE, -- User gave recommendation
            recommendation_received BOOLEAN DEFAULT FALSE, -- User received recommendation
            endorsement_count INTEGER DEFAULT 0, -- Professional endorsements
            mutual_connections_count INTEGER DEFAULT 0, -- Shared connections
            
            -- Network and social graph analytics
            connection_path_length INTEGER, -- Degrees of separation
            network_influence_score DECIMAL(5,4), -- Network influence (0-1)
            relationship_weight DECIMAL(5,4) DEFAULT 0.5, -- Weight in network graph (0-1)
            clustering_coefficient DECIMAL(5,4), -- Network clustering (0-1)
            
            -- Geographic and institutional context
            same_institution BOOLEAN DEFAULT FALSE, -- Same current institution
            same_department BOOLEAN DEFAULT FALSE, -- Same department
            same_geographic_region BOOLEAN DEFAULT FALSE, -- Same geographic area
            distance_km INTEGER, -- Geographic distance in kilometers
            institutional_hierarchy_difference INTEGER, -- Difference in institutional levels
            
            -- Research and academic alignment
            research_compatibility_score DECIMAL(3,2), -- Research compatibility (0-1)
            shared_research_interests TEXT[], -- Common research areas
            complementary_skills TEXT[], -- Complementary skill sets
            collaboration_potential_score DECIMAL(3,2), -- Potential for collaboration (0-1)
            
            -- Historical and temporal aspects
            relationship_duration_days INTEGER DEFAULT 0, -- Days since relationship started
            relationship_milestones JSONB DEFAULT '[]', -- Important milestones
            interaction_patterns JSONB DEFAULT '{}', -- Patterns of interaction
            seasonal_activity JSONB DEFAULT '{}', -- Seasonal interaction patterns
            
            -- Quality and satisfaction metrics
            relationship_satisfaction_rating INTEGER, -- 1-10 satisfaction with relationship
            professional_benefit_rating INTEGER, -- 1-10 professional benefit
            would_recommend_collaboration BOOLEAN, -- Would recommend working together
            relationship_effectiveness_score DECIMAL(3,2), -- Effectiveness (0-1)
            
            -- Notifications and alerts
            notification_preferences JSONB DEFAULT '{}', -- Notification settings
            alert_on_activity BOOLEAN DEFAULT TRUE, -- Alert on related user activity
            alert_on_publications BOOLEAN DEFAULT TRUE, -- Alert on new publications
            alert_on_thesis_updates BOOLEAN DEFAULT TRUE, -- Alert on thesis updates
            
            -- Social and behavioral analysis
            communication_style_compatibility INTEGER, -- 1-10 communication compatibility
            working_style_compatibility INTEGER, -- 1-10 working style match
            personality_compatibility INTEGER, -- 1-10 personality match
            cultural_compatibility INTEGER, -- 1-10 cultural understanding
            
            -- External system integration
            linkedin_connection BOOLEAN DEFAULT FALSE, -- Connected on LinkedIn
            orcid_connection BOOLEAN DEFAULT FALSE, -- Connected via ORCID
            researchgate_connection BOOLEAN DEFAULT FALSE, -- Connected on ResearchGate
            google_scholar_connection BOOLEAN DEFAULT FALSE, -- Connected via Google Scholar
            external_profile_links JSONB DEFAULT '{}', -- Links to external profiles
            
            -- Machine learning and recommendations
            ml_compatibility_score DECIMAL(5,4), -- ML-computed compatibility (0-1)
            recommendation_algorithm VARCHAR(50), -- Algorithm that suggested relationship
            similarity_features JSONB DEFAULT '{}', -- Features used for similarity
            predicted_collaboration_success DECIMAL(3,2), -- Predicted success (0-1)
            
            -- Moderation and safety
            is_reported BOOLEAN DEFAULT FALSE, -- Relationship reported as inappropriate
            report_count INTEGER DEFAULT 0, -- Number of reports
            is_blocked_by_admin BOOLEAN DEFAULT FALSE, -- Blocked by administrator
            safety_score DECIMAL(3,2) DEFAULT 1.0, -- Safety assessment (0-1)
            
            -- Business and networking context
            business_relationship BOOLEAN DEFAULT FALSE, -- Business/commercial relationship
            networking_value_score DECIMAL(3,2), -- Networking value (0-1)
            career_relevance_score DECIMAL(3,2), -- Career relevance (0-1)
            opportunity_potential_score DECIMAL(3,2), -- Opportunity potential (0-1)
            
            -- Status and lifecycle
            is_active BOOLEAN DEFAULT TRUE,
            is_archived BOOLEAN DEFAULT FALSE, -- Archived but preserved
            archive_reason TEXT, -- Why relationship was archived
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity_at TIMESTAMP, -- Last recorded activity
            relationship_ended_at TIMESTAMP, -- When relationship formally ended
        );    

    4. users

        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Authentication
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            
            -- Personal information
            first_name VARCHAR(20) NOT NULL,
            last_name VARCHAR(20) NOT NULL,
            title VARCHAR(50) NOT NULL, -- Dr., Prof., Mr., Ms., etc.
            
            -- Institutional affiliation
            university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
            faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE,
            department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
            school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
            institution_type VARCHAR(50) DEFAULT 'student' ON DELETE CASCADE, -- student, faculty, staff, researcher, admin, external
            
            -- Contact information
            phone VARCHAR(20),
            alternative_email VARCHAR(255),
            
            -- System settings
            language VARCHAR(5) DEFAULT 'fr' REFERENCES languages(code),
            timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
            
            -- Roles and permissions
            role VARCHAR(50) DEFAULT 'user', -- user, moderator, admin, super_admin
            permissions JSONB DEFAULT '{}', -- Flexible permissions system
            
            -- Account status
            email_verified BOOLEAN DEFAULT FALSE,
            email_verification_token VARCHAR(255),
            email_verification_expires TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            is_banned BOOLEAN DEFAULT FALSE,
            ban_reason TEXT,
            banned_until TIMESTAMP,
            
            -- Password reset
            password_reset_token VARCHAR(255),
            password_reset_expires TIMESTAMP,
            
            -- Activity tracking
            last_login TIMESTAMP,
            login_count INTEGER DEFAULT 0,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            
            -- Privacy settings
            profile_visibility VARCHAR(20) DEFAULT 'public', -- public, institution, private
            allow_notifications BOOLEAN DEFAULT TRUE,
            allow_email_notifications BOOLEAN DEFAULT TRUE,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP, -- Soft delete            
        );


    5. user_profiles

        CREATE TABLE user_profiles (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            
            -- Extended personal information
            birth_date DATE,
            gender VARCHAR(10),
            nationality VARCHAR(20),
            
            -- Professional information
            professional_title VARCHAR(20), -- Dr., Prof., PhD, HDR, etc.
            
            -- Academic and research profiles
            orcid VARCHAR(50) UNIQUE,
            google_scholar_id VARCHAR(100) UNIQUE,
            researchgate_url VARCHAR(255) UNIQUE,
            academia_edu_url VARCHAR(255),
            linkedin_url VARCHAR(255) UNIQUE,
            
            -- Media and documents
            profile_picture_url VARCHAR(500) UNIQUE,
            
            -- Contact preferences
            preferred_contact_method VARCHAR(50) DEFAULT 'email', -- email, phone, platform_message
            preferred_contact_language VARCHAR(5) REFERENCES languages(code),
            available_for_collaboration BOOLEAN DEFAULT TRUE,
            available_for_mentoring BOOLEAN DEFAULT FALSE,
            available_for_review BOOLEAN DEFAULT FALSE,
            
            -- Location information
            current_location_id UUID REFERENCES geographic_entities(id),
            hometown_location_id UUID REFERENCES geographic_entities(id),
            work_location_id UUID REFERENCES geographic_entities(id),
            
            -- Privacy settings
            profile_visibility VARCHAR(20) DEFAULT 'public', -- public, institution, private, custom
            show_email BOOLEAN DEFAULT FALSE,
            show_phone BOOLEAN DEFAULT FALSE,
            show_location BOOLEAN DEFAULT FALSE,
            show_thesis_count BOOLEAN DEFAULT TRUE,
            show_publication_count BOOLEAN DEFAULT TRUE,
            
            -- Notification preferences
            email_notifications BOOLEAN DEFAULT TRUE,
            push_notifications BOOLEAN DEFAULT TRUE,
            weekly_digest BOOLEAN DEFAULT TRUE,
            research_recommendations BOOLEAN DEFAULT TRUE,
            collaboration_requests BOOLEAN DEFAULT TRUE,
            comment_notifications BOOLEAN DEFAULT TRUE,
            citation_notifications BOOLEAN DEFAULT TRUE,
            
            -- Academic metrics (updated periodically)
            thesis_count INTEGER DEFAULT 0,
            publication_count INTEGER DEFAULT 0,
            citation_count INTEGER DEFAULT 0,
            h_index INTEGER DEFAULT 0,
            supervised_thesis_count INTEGER DEFAULT 0,
            jury_participation_count INTEGER DEFAULT 0,
            
            -- Platform engagement metrics
            profile_views INTEGER DEFAULT 0,
            profile_view_count_month INTEGER DEFAULT 0,
            last_profile_view TIMESTAMP,
            
            -- Verification status
            is_verified_researcher BOOLEAN DEFAULT FALSE,
            verification_method VARCHAR(50), -- orcid, institutional_email, admin_verified, document_verified
            verified_at TIMESTAMP,
            verified_by UUID REFERENCES users(id),
            
            -- Additional preferences
            timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
            theme_preference VARCHAR(20) DEFAULT 'light', -- light, dark, auto
            
            -- Status
            is_public BOOLEAN DEFAULT TRUE,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP,
        );


    6. user_sessions



    7. user_preferences



    8. user_notifications



    9. user_activity_log



4. Document Extraction & Processing System (8 tables)

    1. extraction_batches

        CREATE TABLE extraction_batches (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                
                -- Batch identification
                batch_name VARCHAR(255),
                description TEXT,
                batch_identifier VARCHAR(100) UNIQUE, -- Human-readable batch ID like "BATCH-2025-001"
                
                -- Batch source and context
                submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                submission_type VARCHAR(30) DEFAULT 'manual', -- manual, api, bulk_import, migration, scheduled
                source_description TEXT, -- Description of where files came from
                
                -- Institutional context
                target_university_id UUID REFERENCES universities(id),
                target_faculty_id UUID REFERENCES faculties(id),
                target_school_id UUID REFERENCES schools(id),
                target_department_id UUID REFERENCES departments(id),
                default_category_id UUID REFERENCES categories(id), -- Default discipline if not detected
                default_study_design_id UUID REFERENCES study_designs(id),
                
                -- Batch configuration
                processing_priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
                max_concurrent_jobs INTEGER DEFAULT 5, -- Parallel processing limit
                retry_failed_jobs BOOLEAN DEFAULT TRUE,
                auto_approve_high_confidence BOOLEAN DEFAULT FALSE, -- Auto-approve jobs with >90% confidence
                notification_email VARCHAR(255), -- Where to send completion notifications
                
                -- File information
                total_files INTEGER DEFAULT 0,
                total_file_size BIGINT DEFAULT 0, -- Total size in bytes
                file_types_included VARCHAR(20)[] DEFAULT '{}', -- pdf, docx, etc.
                supported_files INTEGER DEFAULT 0, -- Files that can be processed
                unsupported_files INTEGER DEFAULT 0, -- Files that cannot be processed
                
                -- Processing status and progress
                batch_status VARCHAR(30) DEFAULT 'created', -- created, queued, processing, paused, completed, failed, cancelled
                processing_started_at TIMESTAMP,
                processing_completed_at TIMESTAMP,
                estimated_completion_time TIMESTAMP,
                
                -- Job statistics
                completed_jobs INTEGER DEFAULT 0,
                successful_jobs INTEGER DEFAULT 0,
                failed_jobs INTEGER DEFAULT 0,
                pending_jobs INTEGER DEFAULT 0,
                skipped_jobs INTEGER DEFAULT 0, -- Files skipped due to duplicates/errors
                
                
                -- Error tracking
                total_errors INTEGER DEFAULT 0,
                critical_errors INTEGER DEFAULT 0, -- Errors that stopped processing
                warning_count INTEGER DEFAULT 0,
                common_error_types TEXT[], -- Most common error categories
                
                -- Resource usage
                total_processing_time_seconds INTEGER DEFAULT 0,
                peak_memory_usage_mb INTEGER,
                total_cpu_time_seconds INTEGER,
                
                -- Admin and review workflow
                requires_admin_review BOOLEAN DEFAULT FALSE,
                admin_reviewer_id UUID REFERENCES users(id),
                admin_review_completed BOOLEAN DEFAULT FALSE,
                admin_review_notes TEXT,
                admin_review_date TIMESTAMP,
                
                -- Result summary
                theses_created INTEGER DEFAULT 0, -- Successfully created thesis records
                entities_created INTEGER DEFAULT 0, -- New entities created (authors, keywords, etc.)
                entities_matched INTEGER DEFAULT 0, -- Existing entities matched
                duplicates_detected INTEGER DEFAULT 0, -- Potential duplicate theses found
                
                -- Data quality assessment
                completeness_score DECIMAL(3,2), -- How complete is the extracted data (0-1)
                consistency_score DECIMAL(3,2), -- How consistent across the batch (0-1)
                data_quality_issues TEXT[], -- List of quality issues found
                
                -- External integration
                external_batch_id VARCHAR(255), -- ID in external system if imported
                integration_source VARCHAR(100), -- Source system name
                external_metadata JSONB DEFAULT '{}', -- Additional metadata from source
                
                -- Scheduling and automation
                is_scheduled_batch BOOLEAN DEFAULT FALSE,
                schedule_pattern VARCHAR(100), -- Cron-like pattern if recurring
                next_scheduled_run TIMESTAMP,
                parent_batch_id UUID REFERENCES extraction_batches(id), -- For recurring batches
                
                -- Cleanup and retention
                cleanup_after_days INTEGER DEFAULT 90, -- Auto-cleanup processed files after X days
                retain_failed_jobs BOOLEAN DEFAULT TRUE,
                archive_completed_batch BOOLEAN DEFAULT FALSE,
                
                -- Status flags
                is_active BOOLEAN DEFAULT TRUE,
                is_paused BOOLEAN DEFAULT FALSE,
                pause_reason TEXT,
                is_cancelled BOOLEAN DEFAULT FALSE,
                cancellation_reason TEXT,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            );

    
    2. extraction_jobs

        CREATE TABLE extraction_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Batch relationship
            batch_id UUID REFERENCES extraction_batches(id) ON DELETE CASCADE,
            job_sequence_number INTEGER, -- Position within batch (1, 2, 3...)
            
            -- File information
            original_filename VARCHAR(255) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            file_size BIGINT NOT NULL,
            file_type VARCHAR(10) NOT NULL, -- pdf, docx
            file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for deduplication
            file_encoding VARCHAR(50), -- UTF-8, etc.
            
            -- File validation
            is_valid_file BOOLEAN DEFAULT TRUE,
            validation_errors TEXT[], -- File format issues, corruption, etc.
            file_page_count INTEGER, -- Detected page count
            file_word_count INTEGER, -- Estimated word count
            
            -- Processing context
            submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            target_university_id UUID REFERENCES universities(id),
            target_faculty_id UUID REFERENCES faculties(id),
            target_department_id UUID REFERENCES departments(id),
            
            -- Processing status (admin view)
            processing_status VARCHAR(30) DEFAULT 'queued',
            processing_substatus VARCHAR(50), -- more detailed status
            processing_stage VARCHAR(30) DEFAULT 'validation', -- validation, extraction, matching, review, completion
            
            -- User status (user-facing)
            user_status VARCHAR(30) DEFAULT 'sent',
            user_message TEXT, -- Status message for user
            
            -- Job priority and scheduling
            priority INTEGER DEFAULT 0,
            scheduled_for TIMESTAMP, -- When to process this job
            
            -- Processing attempts and retry logic
            attempt_number INTEGER DEFAULT 1,
            max_attempts INTEGER DEFAULT 3,
            retry_after TIMESTAMP, -- When to retry if failed
            retry_delay_seconds INTEGER DEFAULT 300, -- 5 minutes default
            
            -- Processing timeline
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            failed_at TIMESTAMP,
            last_attempt_at TIMESTAMP,
            
            -- Processing performance
            processing_time_ms INTEGER, -- Total processing time
            extraction_time_ms INTEGER, -- Time spent on extraction
            matching_time_ms INTEGER, -- Time spent on entity matching
            validation_time_ms INTEGER, -- Time spent on validation
            
            -- Processing configuration
            extraction_method VARCHAR(30) DEFAULT 'auto', -- auto, ocr_only, text_only, hybrid
            extraction_language VARCHAR(5) REFERENCES languages(code),
            force_ocr BOOLEAN DEFAULT FALSE, -- Force OCR even for text-based PDFs
            
            -- Results and output
            extraction_confidence_overall DECIMAL(3,2), -- Overall confidence (0.01-1.00)
            extraction_success_rate DECIMAL(3,2), -- How much data was successfully extracted
            created_thesis_id UUID REFERENCES theses(id), -- If thesis was successfully created
            
            -- Error handling
            error_type VARCHAR(50), -- file_error, extraction_error, matching_error, validation_error
            error_message TEXT,
            error_details JSONB DEFAULT '{}', -- Structured error information
            is_recoverable_error BOOLEAN DEFAULT TRUE,
            
            -- Quality assessment
            data_completeness_score DECIMAL(3,2), -- How complete is extracted data (0-1)
            data_quality_issues TEXT[], -- Specific quality issues found
            manual_review_required BOOLEAN DEFAULT FALSE,
            quality_flags TEXT[], -- red_flags, missing_data, low_confidence, etc.
            
            -- Duplicate detection
            potential_duplicate_thesis_ids UUID[], -- Potential duplicate theses found
            duplicate_confidence_scores DECIMAL(3,2)[], -- Confidence for each potential duplicate
            is_likely_duplicate BOOLEAN DEFAULT FALSE,
            
            -- Processing resources
            processing_node_id VARCHAR(100), -- Which processing node handled this job
            memory_usage_mb INTEGER,
            cpu_time_ms INTEGER,
            disk_space_used_mb INTEGER,
            
            -- External processing
            external_job_id VARCHAR(255), -- ID in external processing system
            external_processing_url VARCHAR(500), -- URL for external processing status
            uses_external_service BOOLEAN DEFAULT FALSE,
            
            -- Review and approval workflow
            requires_manual_review BOOLEAN DEFAULT FALSE,
            review_assigned_to UUID REFERENCES users(id),
            review_priority INTEGER DEFAULT 0, -- Higher = more urgent
            review_deadline TIMESTAMP,
            
            -- AI/ML processing metadata
            ai_model_version VARCHAR(50), -- Version of AI model used
            ai_processing_confidence DECIMAL(3,2), -- AI confidence in processing
            ai_suggestions JSONB DEFAULT '{}', -- AI suggestions for improvement
            
            -- Notification preferences
            notify_on_completion BOOLEAN DEFAULT TRUE,
            notify_on_error BOOLEAN DEFAULT TRUE,
            notification_email VARCHAR(255), -- Override user's email
            
            -- Cleanup and retention
            temp_files_cleanup BOOLEAN DEFAULT FALSE,
            retain_processing_logs BOOLEAN DEFAULT TRUE,
            auto_archive_after_days INTEGER DEFAULT 30,
            
            -- Status tracking
            is_active BOOLEAN DEFAULT TRUE,
            is_cancelled BOOLEAN DEFAULT FALSE,
            cancellation_reason TEXT,
            cancelled_by UUID REFERENCES users(id),
            cancelled_at TIMESTAMP,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_status_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,            
        );

    
    3. extracted_metadata

        CREATE TABLE extracted_metadata (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Source job relationship
            job_id UUID NOT NULL REFERENCES extraction_jobs(id) ON DELETE CASCADE,
            
            -- Extraction metadata
            extraction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            extraction_method VARCHAR(30) NOT NULL, -- ocr, text_parse, ai_extraction, hybrid, manual
            
            -- Raw text fields
            raw_title_fr TEXT,
            raw_title_ar TEXT,
            raw_title_en TEXT,
            raw_thesis_number TEXT,

            raw_university_fr TEXT,
            raw_university_ar TEXT,
            raw_university_en TEXT,

            raw_faculty_fr TEXT,
            raw_faculty_ar TEXT,
            raw_faculty_en TEXT,

            raw_department_fr TEXT,
            raw_department_ar TEXT,
            raw_department_en TEXT,

            raw_school_fr TEXT,
            raw_school_ar TEXT,
            raw_school_en TEXT,

            raw_author_first_name TEXT,
            raw_author_last_name TEXT,
            raw_author_birth_date TEXT,
            raw_author_birth_place TEXT,

            raw_director_full_name TEXT,
            raw_director_first_name TEXT,
            raw_director_last_name TEXT,

            raw_co_director_full_name TEXT,
            raw_co_director_first_name TEXT,
            raw_co_director_last_name TEXT,

            raw_jury_members JSONB DEFAULT '[]', 
            /* Structure: [
                {
                    "full_name": "Pr. Ahmed EL MOUSSAOUI",
                    "first_name": "Ahmed",
                    "last_name": "EL MOUSSAOUI", 
                    "title": "Pr.",
                    "role": "Président",
                    "institution": "Présidence de l'UAE",
                    "is_external": false
                }, ...
            ] */

            raw_degree TEXT,
            raw_full_name_degree TEXT,
            raw_degree_level TEXT,

            raw_defense_date TEXT,
            raw_academic_year TEXT,

            raw_category_name TEXT,
            raw_category_level INTEGER,

            raw_abstract_fr TEXT,
            raw_abstract_ar TEXT,
            raw_abstract_en TEXT,
            
            raw_keywords_fr TEXT,
            raw_keywords_ar TEXT,
            raw_keywords_en TEXT,            
                        
            -- Research information
            raw_study_design TEXT,
            raw_location TEXT,
            
            -- Document structure and content
            raw_language VARCHAR(5),
            raw_secondary_languages VARCHAR(5)[],
            raw_page_count INTEGER,
            raw_abstract_pages INTEGER[],
            raw_table_of_contents TEXT,
            raw_toc_start_page INTEGER,
            raw_toc_end_page INTEGER,
            raw_bibliography TEXT,
            raw_bibliography_start_page INTEGER,
            raw_bibliography_end_page INTEGER,
            raw_appendices_start_page INTEGER,
            
            has_cover_page BOOLEAN DEFAULT FALSE,
            has_table_of_contents BOOLEAN DEFAULT FALSE,
            has_bibliography BOOLEAN DEFAULT FALSE,
            has_appendices BOOLEAN DEFAULT FALSE,
            has_figures BOOLEAN DEFAULT FALSE,
            has_tables BOOLEAN DEFAULT FALSE,
                    
            -- Status and processing
            is_processed BOOLEAN DEFAULT FALSE,
            processing_notes TEXT,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,            
        );


    4. entity_matches

        CREATE TABLE entity_matches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Source extraction relationship
            extraction_id UUID NOT NULL REFERENCES extracted_metadata(id) ON DELETE CASCADE,
            job_id UUID NOT NULL REFERENCES extraction_jobs(id) ON DELETE CASCADE, -- Denormalized for performance
            
            -- Entity matching details
            entity_type VARCHAR(50) NOT NULL, -- university, faculty, academic_person, keyword, category, study_design
            raw_value TEXT NOT NULL, -- Original extracted text
            normalized_value TEXT, -- Cleaned/normalized version for matching
            
            -- Best match found
            matched_entity_id UUID, -- ID of matched entity in respective table
            matched_entity_table VARCHAR(50), -- Table name where entity exists
            matched_entity_name TEXT, -- Cached name of matched entity
            
            -- Matching algorithm results
            match_confidence DECIMAL(3,2), -- Confidence in the match (0.01-1.00)
            match_method VARCHAR(50) NOT NULL, -- exact, fuzzy, phonetic, ai, semantic, manual
            match_algorithm_version VARCHAR(20), -- Version of matching algorithm used
            
            -- Alternative matches
            alternative_matches JSONB DEFAULT '[]', -- Array of other potential matches with scores
            runner_up_match_id UUID, -- Second best match for comparison
            runner_up_confidence DECIMAL(3,2), -- Confidence of second best match
            confidence_gap DECIMAL(3,2), -- Gap between best and second best match
            
            -- Match context and evidence
            context_clues TEXT[], -- Additional context that helped matching
            matching_evidence JSONB DEFAULT '{}', -- Evidence used in matching decision
            similarity_metrics JSONB DEFAULT '{}', -- Various similarity scores (edit_distance, semantic, etc.)
            
            -- Geographic and institutional context
            context_university_id UUID REFERENCES universities(id), -- University context for matching
            context_faculty_id UUID REFERENCES faculties(id), -- Faculty context for matching
            context_language VARCHAR(5) REFERENCES languages(code), -- Language context
            context_country VARCHAR(100), -- Country context for matching
            
            -- Matching status and workflow
            match_status VARCHAR(30) DEFAULT 'pending', -- pending, confirmed, rejected, needs_review, auto_approved
            requires_human_review BOOLEAN DEFAULT FALSE,
            review_priority INTEGER DEFAULT 0, -- Higher = more urgent review needed
            
            -- Human review process
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP,
            review_decision VARCHAR(30), -- confirmed, rejected, modified, needs_more_info
            review_notes TEXT,
            review_confidence_override DECIMAL(3,2), -- Human override of confidence score
            
            -- Quality and validation
            validation_flags TEXT[], -- suspicious, low_confidence, conflicting_data, incomplete
            data_quality_score DECIMAL(3,2), -- Quality of the raw data (0.01-1.00)
            matching_difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard, very_hard
            
            -- Entity creation suggestion
            suggests_new_entity BOOLEAN DEFAULT FALSE, -- Should we create a new entity?
            new_entity_confidence DECIMAL(3,2), -- Confidence that this should be a new entity
            new_entity_justification TEXT, -- Why this should be a new entity
            
            -- Batch and processing context
            processing_batch_id UUID, -- If part of batch processing
            processing_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processing_node_id VARCHAR(100), -- Which node performed matching
            
            -- Performance metrics
            matching_time_ms INTEGER, -- Time taken to find matches
            alternatives_evaluated INTEGER DEFAULT 0, -- Number of alternatives considered
            database_queries_count INTEGER DEFAULT 0, -- Queries executed during matching
            
            -- Disambiguation context
            disambiguation_required BOOLEAN DEFAULT FALSE,
            disambiguation_factors TEXT[], -- Factors that make disambiguation difficult
            ambiguity_score DECIMAL(3,2), -- How ambiguous is this match (0-1)
            
            -- Machine learning features
            ml_features JSONB DEFAULT '{}', -- Features used by ML matching algorithms
            ml_model_version VARCHAR(20), -- Version of ML model used
            ml_prediction_confidence DECIMAL(3,2), -- ML model confidence
            human_ml_agreement BOOLEAN, -- Does human review agree with ML?
            
            -- External validation
            external_validation_attempted BOOLEAN DEFAULT FALSE,
            external_validation_source VARCHAR(100), -- ORCID, institutional directory, etc.
            external_validation_result VARCHAR(30), -- confirmed, rejected, no_data, error
            external_validation_confidence DECIMAL(3,2),
            
            -- Feedback and learning
            match_feedback_score INTEGER, -- User feedback on match quality (1-5)
            feedback_comments TEXT,
            contributes_to_training BOOLEAN DEFAULT TRUE, -- Use for ML training
            
            -- Update and versioning
            original_match_id UUID REFERENCES entity_matches(id), -- If this is an updated match
            is_latest_version BOOLEAN DEFAULT TRUE,
            version_number INTEGER DEFAULT 1,
            
            -- Status flags
            is_active BOOLEAN DEFAULT TRUE,
            is_archived BOOLEAN DEFAULT FALSE,
            archived_reason TEXT,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_accessed TIMESTAMP
        );


    5. suggested_entities

        CREATE TABLE suggested_entities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Source relationship
            match_id UUID NOT NULL REFERENCES entity_matches(id) ON DELETE CASCADE,
            extraction_id UUID NOT NULL REFERENCES extracted_metadata(id) ON DELETE CASCADE, -- Denormalized for performance
            job_id UUID NOT NULL REFERENCES extraction_jobs(id) ON DELETE CASCADE, -- Denormalized for performance
            
            -- Entity suggestion details
            entity_type VARCHAR(50) NOT NULL, -- university, faculty, academic_person, keyword, category, study_design
            suggested_table VARCHAR(50) NOT NULL, -- Target table for new entity
            
            -- Raw source data
            source_raw_value TEXT NOT NULL, -- Original extracted text
            source_context TEXT, -- Context where this entity was found
            source_document_section VARCHAR(100), -- title, abstract, bibliography, etc.
            
            -- Suggested entity data (structured)
            suggested_data JSONB NOT NULL, -- Proposed entity data for creation
            suggested_name VARCHAR(255), -- Primary name/title (extracted from JSONB for indexing)
            suggested_name_variants TEXT[], -- Alternative names/spellings
            
            -- Confidence and evidence
            suggestion_confidence DECIMAL(3,2) NOT NULL, -- Confidence this should be new entity (0.01-1.00)
            evidence_strength DECIMAL(3,2), -- Strength of evidence for creation (0.01-1.00)
            uniqueness_score DECIMAL(3,2), -- How unique/distinct this entity is (0.01-1.00)
            
            -- Supporting evidence
            supporting_evidence JSONB DEFAULT '{}', -- Evidence supporting entity creation
            contextual_clues TEXT[], -- Context clues that support this being a new entity
            co_occurrence_entities UUID[], -- Other entities that appear with this one
            frequency_in_source INTEGER DEFAULT 1, -- How often this entity appears in source
            
            -- Suggestion reasoning
            suggestion_reason VARCHAR(50) NOT NULL, -- no_match_found, low_confidence_matches, context_mismatch, user_request
            suggestion_algorithm VARCHAR(30), -- rule_based, ml_based, hybrid, manual
            algorithm_version VARCHAR(20), -- Version of suggestion algorithm
            suggestion_justification TEXT, -- Detailed explanation
            
            -- Alternative considerations
            rejected_matches JSONB DEFAULT '[]', -- Matches that were considered but rejected
            similar_existing_entities UUID[], -- Existing entities that are similar but not matches
            disambiguation_notes TEXT, -- Notes on why this isn't same as existing entities
            
            -- Data quality and completeness
            data_completeness_percentage INTEGER, -- How complete is the suggested data (0-100)
            required_fields_missing TEXT[], -- Required fields that are missing
            data_quality_issues TEXT[], -- Issues with suggested data
            needs_data_enrichment BOOLEAN DEFAULT FALSE, -- Needs additional data before creation
            
            -- Geographic and institutional context
            context_institution_id UUID REFERENCES universities(id), -- Institution context
            context_geographic_id UUID REFERENCES geographic_entities(id), -- Geographic context
            context_language VARCHAR(5) REFERENCES languages(code), -- Language context
            context_academic_field VARCHAR(100), -- Academic field context
            
            -- Admin review and approval workflow
            suggestion_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected, needs_more_info, in_review
            review_priority INTEGER DEFAULT 0, -- Higher = more urgent (0-10)
            auto_approval_eligible BOOLEAN DEFAULT FALSE, -- Can this be auto-approved?
            
            -- Human review process
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP,
            review_decision VARCHAR(30), -- approved, rejected, modified, merged_with_existing, needs_more_info
            review_notes TEXT,
            reviewer_confidence DECIMAL(3,2), -- Reviewer's confidence in decision (0.01-1.00)
            
            -- Entity creation results
            created_entity_id UUID, -- ID of created entity if approved
            created_entity_table VARCHAR(50), -- Table where entity was created
            creation_timestamp TIMESTAMP, -- When entity was created
            created_by UUID REFERENCES users(id), -- Who created the entity
            
            -- Modification tracking
            original_suggestion_data JSONB, -- Original suggested data before modifications
            modification_history JSONB DEFAULT '[]', -- History of modifications
            final_entity_data JSONB, -- Final data used for entity creation
            data_sources_used TEXT[], -- Sources used to enrich the data
            
            -- Duplicate and merge handling
            is_duplicate_of UUID REFERENCES suggested_entities(id), -- If this is duplicate of another suggestion
            merged_with_entity_id UUID, -- If merged with existing entity instead of creating new
            merge_reason TEXT, -- Why it was merged instead of created
            duplicate_detection_score DECIMAL(3,2), -- Confidence this is a duplicate (0-1)
            
            -- Quality control flags
            quality_flags TEXT[], -- suspicious_data, incomplete_info, conflicting_sources, etc.
            validation_errors TEXT[], -- Validation errors found
            requires_expert_review BOOLEAN DEFAULT FALSE, -- Needs domain expert review
            expert_reviewer_id UUID REFERENCES users(id), -- Domain expert who reviewed
            
            -- External validation and enrichment
            external_validation_attempted BOOLEAN DEFAULT FALSE,
            external_sources_checked TEXT[], -- ORCID, institutional directories, etc.
            external_data_found JSONB DEFAULT '{}', -- Additional data from external sources
            external_validation_confidence DECIMAL(3,2), -- Confidence from external validation
            
            -- Batch processing context
            batch_suggestion_id UUID, -- For batch processing of related suggestions
            related_suggestions UUID[], -- Other suggestions from same source/context
            processing_batch_size INTEGER, -- Size of batch this suggestion belongs to
            
            -- Machine learning and automation
            ml_suggestion_features JSONB DEFAULT '{}', -- Features used by ML suggestion algorithm
            ml_approval_prediction DECIMAL(3,2), -- ML predicted approval probability
            automated_enrichment_applied BOOLEAN DEFAULT FALSE, -- Was automated enrichment used?
            enrichment_sources TEXT[], -- Sources used for automated enrichment
            
            -- Community and collaboration
            community_votes INTEGER DEFAULT 0, -- Community votes for/against creation
            community_comments TEXT[], -- Community feedback
            expert_endorsements INTEGER DEFAULT 0, -- Endorsements from domain experts
            
            -- Performance and processing
            suggestion_processing_time_ms INTEGER, -- Time to generate suggestion
            data_enrichment_time_ms INTEGER, -- Time spent on data enrichment
            external_validation_time_ms INTEGER, -- Time spent on external validation
            
            -- Status and lifecycle
            is_active BOOLEAN DEFAULT TRUE,
            is_archived BOOLEAN DEFAULT FALSE,
            archived_reason TEXT,
            expires_at TIMESTAMP, -- When this suggestion expires if not acted upon
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_reviewed_at TIMESTAMP,            
        );


    6. admin_reviews

        CREATE TABLE admin_reviews (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Review context and scope
            review_type VARCHAR(50) NOT NULL, -- extraction_validation, entity_matching, suggestion_approval, batch_review, quality_audit
            review_scope VARCHAR(30) DEFAULT 'single_item', -- single_item, batch, bulk_operation, systematic_review
            
            -- Primary relationships (one or more will be populated based on review type)
            job_id UUID REFERENCES extraction_jobs(id) ON DELETE CASCADE,
            batch_id UUID REFERENCES extraction_batches(id) ON DELETE CASCADE,
            entity_match_id UUID REFERENCES entity_matches(id) ON DELETE CASCADE,
            suggested_entity_id UUID REFERENCES suggested_entities(id) ON DELETE CASCADE,
            
            -- Reviewer assignment
            reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            assigned_by UUID REFERENCES users(id), -- Who assigned this review
            assigned_at TIMESTAMP,
            
            -- Review priority and scheduling
            review_priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent, -1=low
            priority_reason TEXT, -- Why this has special priority
            due_date TIMESTAMP, -- When review should be completed
            estimated_effort_minutes INTEGER, -- Expected time to complete review
            
            -- Review status and progress
            review_status VARCHAR(30) DEFAULT 'assigned', -- assigned, in_progress, completed, on_hold, escalated, cancelled
            progress_percentage INTEGER DEFAULT 0, -- 0-100% completion
            current_stage VARCHAR(50), -- validation, verification, decision, documentation
            
            -- Review timeline
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            actual_effort_minutes INTEGER, -- Actual time spent on review
            
            -- Review criteria and checklist
            review_criteria JSONB DEFAULT '{}', -- Specific criteria for this review
            checklist_items JSONB DEFAULT '[]', -- Review checklist with completion status
            mandatory_checks TEXT[], -- Required validation checks
            optional_checks TEXT[], -- Optional validation checks
            completed_checks TEXT[], -- Checks that have been completed
            
            -- Review findings and assessment
            overall_assessment VARCHAR(30), -- approved, rejected, needs_revision, escalate, partial_approval
            quality_rating INTEGER, -- 1-5 quality rating
            confidence_level DECIMAL(3,2), -- Reviewer confidence in assessment (0.01-1.00)
            
            -- Detailed findings
            findings_summary TEXT, -- Summary of key findings
            issues_identified TEXT[], -- List of issues found
            recommendations TEXT[], -- Recommendations for improvement
            corrective_actions_required TEXT[], -- Required actions before approval
            
            -- Decision details
            approval_decision VARCHAR(30), -- full_approval, conditional_approval, rejection, revision_required
            approval_conditions TEXT[], -- Conditions for conditional approval
            rejection_reasons TEXT[], -- Specific reasons for rejection
            revision_requirements TEXT[], -- What needs to be revised
            
            -- Quality metrics assessed
            data_accuracy_score INTEGER, -- 1-10 scale
            data_completeness_score INTEGER, -- 1-10 scale
            consistency_score INTEGER, -- 1-10 scale
            reliability_score INTEGER, -- 1-10 scale
            
            -- Reviewer notes and comments
            internal_notes TEXT, -- Internal admin notes
            feedback_for_submitter TEXT, -- Feedback to share with original submitter
            technical_notes TEXT, -- Technical observations
            process_improvements TEXT, -- Suggestions for process improvement
            
            -- Evidence and documentation
            evidence_reviewed TEXT[], -- List of evidence examined
            external_sources_consulted TEXT[], -- External sources checked
            screenshots_urls TEXT[], -- Screenshots taken during review
            supporting_documents_urls TEXT[], -- Additional documents referenced
            
            -- Collaboration and consultation
            consulted_experts UUID[], -- Other experts consulted
            peer_reviewer_id UUID REFERENCES users(id), -- Secondary reviewer if needed
            expert_opinions JSONB DEFAULT '{}', -- Expert opinions collected
            consensus_required BOOLEAN DEFAULT FALSE, -- Requires consensus from multiple reviewers
            
            -- Review outcomes and actions
            actions_taken TEXT[], -- Actions performed during review
            entities_created INTEGER DEFAULT 0, -- New entities created as result
            entities_modified INTEGER DEFAULT 0, -- Existing entities modified
            entities_merged INTEGER DEFAULT 0, -- Entities merged during review
            data_corrections_made INTEGER DEFAULT 0, -- Number of data corrections
            
            -- Follow-up and monitoring
            requires_follow_up BOOLEAN DEFAULT FALSE,
            follow_up_date TIMESTAMP, -- When to follow up
            follow_up_assigned_to UUID REFERENCES users(id),
            follow_up_notes TEXT,
            monitoring_period_days INTEGER, -- Days to monitor after approval
            
            -- Escalation handling
            escalation_required BOOLEAN DEFAULT FALSE,
            escalated_to UUID REFERENCES users(id),
            escalation_reason TEXT,
            escalated_at TIMESTAMP,
            escalation_resolution TEXT,
            
            -- Quality assurance
            qa_review_required BOOLEAN DEFAULT FALSE,
            qa_reviewer_id UUID REFERENCES users(id),
            qa_completed BOOLEAN DEFAULT FALSE,
            qa_findings TEXT,
            qa_approval BOOLEAN,
            
            -- Performance metrics
            complexity_rating INTEGER, -- 1-5 complexity of review
            difficulty_factors TEXT[], -- What made this review difficult
            tools_used TEXT[], -- Tools/systems used during review
            automation_assistance_level DECIMAL(3,2), -- How much automation helped (0-1)
            
            -- Statistical tracking
            items_reviewed_count INTEGER DEFAULT 1, -- Number of items in scope
            items_approved_count INTEGER DEFAULT 0,
            items_rejected_count INTEGER DEFAULT 0,
            items_revised_count INTEGER DEFAULT 0,
            
            -- Communication and notifications
            stakeholders_notified UUID[], -- Who was notified of decision
            notification_sent_at TIMESTAMP,
            communication_log JSONB DEFAULT '[]', -- Log of communications
            
            -- Review methodology
            review_methodology VARCHAR(50), -- manual, semi_automated, hybrid, peer_review
            validation_tools_used TEXT[], -- Specific validation tools employed
            sampling_method VARCHAR(30), -- If reviewing subset: random, systematic, stratified
            sample_size INTEGER, -- Size of sample reviewed
            
            -- Learning and improvement
            lessons_learned TEXT, -- What was learned from this review
            process_feedback TEXT, -- Feedback on review process
            training_needs_identified TEXT[], -- Training needs identified
            best_practices_noted TEXT[], -- Best practices observed
            
            -- Audit and compliance
            compliance_standards_checked TEXT[], -- Standards/regulations verified
            audit_trail JSONB DEFAULT '{}', -- Detailed audit trail
            regulatory_requirements_met BOOLEAN, -- Regulatory compliance status
            
            -- Version and history
            review_version INTEGER DEFAULT 1, -- Version of this review
            previous_review_id UUID REFERENCES admin_reviews(id), -- Previous version if revised
            revision_reason TEXT, -- Why review was revised
            
            -- Status flags
            is_active BOOLEAN DEFAULT TRUE,
            is_completed BOOLEAN DEFAULT FALSE,
            is_archived BOOLEAN DEFAULT FALSE,
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,            
        );


    7. validation_rules

        CREATE TABLE validation_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Rule identification
            rule_name VARCHAR(100) UNIQUE NOT NULL,
            rule_code VARCHAR(50) UNIQUE, -- Short code for referencing (e.g., "TITLE_MIN_LENGTH")
            rule_category VARCHAR(50) NOT NULL, -- data_validation, entity_matching, quality_check, compliance
            rule_subcategory VARCHAR(50), -- format, completeness, consistency, business_logic
            
            -- Rule scope and application
            entity_type VARCHAR(50), -- thesis, academic_person, university, etc. (NULL = applies to all)
            field_name VARCHAR(100), -- Specific field name (NULL = applies to entity as whole)
            processing_stage VARCHAR(30) NOT NULL, -- extraction, matching, validation, approval, all_stages
            
            -- Rule definition
            rule_type VARCHAR(30) NOT NULL, -- required, format, range, custom, regex, sql, function
            rule_condition JSONB NOT NULL, -- Flexible rule definition
            rule_expression TEXT, -- SQL expression, regex pattern, or function name
            
            -- Rule parameters
            parameters JSONB DEFAULT '{}', -- Rule-specific parameters
            threshold_values JSONB DEFAULT '{}', -- Threshold values for numerical rules
            allowed_values TEXT[], -- For enum/list validation
            forbidden_values TEXT[], -- Values that are not allowed
            
            -- Validation logic
            validation_function VARCHAR(100), -- Custom validation function name
            validation_query TEXT, -- SQL query for complex validations
            external_validation_api VARCHAR(255), -- External API for validation
            validation_timeout_seconds INTEGER DEFAULT 30, -- Timeout for validation
            
            -- Error handling and messaging
            severity VARCHAR(20) DEFAULT 'error', -- error, warning, info, critical
            error_message_template TEXT NOT NULL, -- Template for error messages
            error_code VARCHAR(50), -- Unique error code for this rule
            help_text TEXT, -- Help text explaining the rule
            suggested_fix TEXT, -- Suggested fix for violations
            
            -- Multilingual support
            error_message_fr TEXT, -- French error message
            error_message_ar TEXT, -- Arabic error message
            help_text_fr TEXT,
            help_text_ar TEXT,
            
            -- Rule conditions and dependencies
            prerequisite_rules UUID[], -- Rules that must pass before this rule
            dependent_rules UUID[], -- Rules that depend on this rule
            mutually_exclusive_rules UUID[], -- Rules that cannot be active simultaneously
            conditional_logic JSONB DEFAULT '{}', -- Complex conditional logic
            
            -- Application context
            applies_to_extraction BOOLEAN DEFAULT TRUE,
            applies_to_matching BOOLEAN DEFAULT TRUE,
            applies_to_suggestions BOOLEAN DEFAULT TRUE,
            applies_to_manual_entry BOOLEAN DEFAULT TRUE,
            applies_to_api_data BOOLEAN DEFAULT TRUE,
            
            -- Institution and geographic scope
            institution_scope UUID[], -- Specific institutions (NULL = all institutions)
            geographic_scope UUID[], -- Specific geographic regions
            language_scope VARCHAR(5)[], -- Languages this rule applies to
            
            -- Rule scheduling and activation
            effective_date DATE DEFAULT CURRENT_DATE, -- When rule becomes effective
            expiry_date DATE, -- When rule expires
            schedule_pattern VARCHAR(100), -- Cron-like pattern for periodic rules
            timezone VARCHAR(50) DEFAULT 'UTC',
            
            -- Performance and execution
            execution_order INTEGER DEFAULT 100, -- Order of execution (lower = earlier)
            max_execution_time_ms INTEGER DEFAULT 5000, -- Maximum execution time
            cache_results BOOLEAN DEFAULT FALSE, -- Cache validation results
            cache_duration_minutes INTEGER DEFAULT 60,
            
            -- Rule configuration
            is_mandatory BOOLEAN DEFAULT TRUE, -- Must pass for approval
            allow_override BOOLEAN DEFAULT FALSE, -- Can admin override failures?
            require_justification_for_override BOOLEAN DEFAULT TRUE,
            auto_fix_available BOOLEAN DEFAULT FALSE, -- Can be automatically fixed
            auto_fix_function VARCHAR(100), -- Function to automatically fix violations
            
            -- Statistical tracking
            total_executions BIGINT DEFAULT 0, -- Total times rule was executed
            total_violations BIGINT DEFAULT 0, -- Total violations found
            total_overrides BIGINT DEFAULT 0, -- Total admin overrides
            last_violation_date TIMESTAMP, -- Last time rule was violated
            avg_execution_time_ms INTEGER, -- Average execution time
            
            -- Quality metrics
            false_positive_rate DECIMAL(5,4), -- Rate of false positives (0-1)
            false_negative_rate DECIMAL(5,4), -- Rate of false negatives (0-1)
            accuracy_score DECIMAL(5,4), -- Overall accuracy (0-1)
            user_satisfaction_score DECIMAL(3,2), -- User satisfaction with rule (1-5)
            
            -- Rule maintenance
            created_by UUID NOT NULL REFERENCES users(id),
            last_modified_by UUID REFERENCES users(id),
            review_frequency_days INTEGER DEFAULT 90, -- How often to review rule
            last_reviewed_date DATE,
            next_review_date DATE,
            
            -- Documentation and versioning
            version_number VARCHAR(20) DEFAULT '1.0',
            changelog TEXT, -- Changes made in this version
            documentation_url VARCHAR(500), -- Link to detailed documentation
            test_cases JSONB DEFAULT '[]', -- Test cases for this rule
            
            -- Rule relationships and grouping
            rule_group VARCHAR(100), -- Group for related rules
            parent_rule_id UUID REFERENCES validation_rules(id), -- For hierarchical rules
            rule_weight DECIMAL(3,2) DEFAULT 1.0, -- Weight in composite scoring
            
            -- Machine learning integration
            ml_model_assisted BOOLEAN DEFAULT FALSE, -- Uses ML model for validation
            ml_model_name VARCHAR(100), -- Name of ML model used
            ml_confidence_threshold DECIMAL(3,2), -- Minimum ML confidence required
            continuous_learning BOOLEAN DEFAULT FALSE, -- Updates based on feedback
            
            -- Business context
            business_justification TEXT, -- Why this rule exists
            regulatory_requirement VARCHAR(255), -- Regulatory basis if applicable
            compliance_standard VARCHAR(100), -- Compliance standard (GDPR, etc.)
            risk_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
            
            -- Monitoring and alerting
            alert_on_high_violation_rate BOOLEAN DEFAULT FALSE,
            violation_rate_threshold DECIMAL(3,2) DEFAULT 0.1, -- Alert if >10% violations
            alert_recipients UUID[], -- Who to alert
            monitoring_enabled BOOLEAN DEFAULT TRUE,
            
            -- Status and lifecycle
            rule_status VARCHAR(30) DEFAULT 'active', -- active, inactive, deprecated, testing
            deprecation_date DATE, -- When rule was deprecated
            replacement_rule_id UUID REFERENCES validation_rules(id), -- Replacement rule
            is_system_rule BOOLEAN DEFAULT FALSE, -- System-generated rule
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_executed_at TIMESTAMP,
        );

    
    8. extraction_settings

        CREATE TABLE extraction_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Setting identification
            setting_key VARCHAR(100) UNIQUE NOT NULL,
            setting_name VARCHAR(255) NOT NULL, -- Human-readable name
            setting_group VARCHAR(50) NOT NULL, -- processing, matching, validation, notifications, performance
            setting_subgroup VARCHAR(50), -- ocr, ai_models, thresholds, timeouts, etc.
            
            -- Setting value and type
            setting_value JSONB NOT NULL, -- Flexible value storage
            setting_type VARCHAR(30) NOT NULL, -- string, integer, float, boolean, array, object, enum
            data_type VARCHAR(30) NOT NULL, -- text, number, json, url, email, password, etc.
            
            -- Value constraints and validation
            allowed_values JSONB, -- For enum/restricted values
            min_value NUMERIC, -- Minimum value for numeric settings
            max_value NUMERIC, -- Maximum value for numeric settings
            validation_pattern VARCHAR(500), -- Regex pattern for validation
            validation_function VARCHAR(100), -- Custom validation function
            
            -- Default and fallback values
            default_value JSONB, -- Default value if not set
            fallback_value JSONB, -- Fallback if setting fails
            is_nullable BOOLEAN DEFAULT FALSE, -- Can value be null
            
            -- Setting metadata and documentation
            description TEXT NOT NULL, -- Description of what this setting does
            description_fr TEXT, -- French description
            description_ar TEXT, -- Arabic description
            usage_notes TEXT, -- Usage notes and best practices
            example_values JSONB DEFAULT '[]', -- Example valid values
            
            -- Setting scope and application
            applies_to_extraction BOOLEAN DEFAULT TRUE,
            applies_to_matching BOOLEAN DEFAULT TRUE,
            applies_to_validation BOOLEAN DEFAULT TRUE,
            applies_to_notifications BOOLEAN DEFAULT FALSE,
            applies_to_performance BOOLEAN DEFAULT FALSE,
            
            -- Institutional and geographic scope
            institution_specific BOOLEAN DEFAULT FALSE, -- Can be overridden per institution
            institution_overrides JSONB DEFAULT '{}', -- Institution-specific values
            geographic_scope UUID[], -- Geographic regions this applies to
            language_specific BOOLEAN DEFAULT FALSE, -- Language-specific settings
            language_overrides JSONB DEFAULT '{}', -- Language-specific values
            
            -- Environment and deployment
            environment_scope VARCHAR(30) DEFAULT 'all', -- development, testing, production, all
            deployment_target VARCHAR(50) DEFAULT 'system', -- system, node, cluster, instance
            requires_restart BOOLEAN DEFAULT FALSE, -- Requires system restart to apply
            hot_reload_supported BOOLEAN DEFAULT TRUE, -- Can be updated without restart
            
            -- Priority and precedence
            priority_level INTEGER DEFAULT 100, -- Higher = more important
            override_hierarchy TEXT[] DEFAULT ARRAY['user', 'institution', 'system'], -- Override precedence
            can_be_overridden BOOLEAN DEFAULT TRUE, -- Can users/institutions override
            
            -- Change management
            requires_approval BOOLEAN DEFAULT FALSE, -- Changes need admin approval
            approval_level VARCHAR(30) DEFAULT 'admin', -- admin, super_admin, system_admin
            change_impact_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
            rollback_supported BOOLEAN DEFAULT TRUE, -- Can changes be rolled back
            
            -- Performance and optimization
            cache_enabled BOOLEAN DEFAULT TRUE, -- Cache this setting value
            cache_ttl_seconds INTEGER DEFAULT 300, -- Cache time-to-live
            lazy_loading BOOLEAN DEFAULT FALSE, -- Load only when needed
            preload_on_startup BOOLEAN DEFAULT TRUE, -- Load during system startup
            
            -- Monitoring and alerting
            monitor_changes BOOLEAN DEFAULT TRUE, -- Monitor for changes
            alert_on_change BOOLEAN DEFAULT FALSE, -- Send alerts when changed
            log_access BOOLEAN DEFAULT FALSE, -- Log when setting is accessed
            alert_recipients UUID[], -- Who to alert on changes
            
            -- Security and access control
            sensitivity_level VARCHAR(20) DEFAULT 'internal', -- public, internal, confidential, secret
            encryption_required BOOLEAN DEFAULT FALSE, -- Encrypt value in storage
            access_roles TEXT[] DEFAULT ARRAY['admin'], -- Roles that can modify
            read_only_roles TEXT[], -- Roles that can only read
            audit_changes BOOLEAN DEFAULT TRUE, -- Audit all changes
            
            -- Integration and external dependencies
            external_source VARCHAR(100), -- External system providing this setting
            external_sync_enabled BOOLEAN DEFAULT FALSE, -- Sync with external source
            external_sync_interval_minutes INTEGER, -- Sync interval
            api_accessible BOOLEAN DEFAULT TRUE, -- Available via API
            webhook_on_change BOOLEAN DEFAULT FALSE, -- Trigger webhook on change
            webhook_url VARCHAR(500), -- Webhook URL
            
            -- Machine learning and AI settings
            ml_model_parameter BOOLEAN DEFAULT FALSE, -- Is this an ML model parameter
            model_name VARCHAR(100), -- Which ML model uses this
            parameter_category VARCHAR(50), -- hyperparameter, threshold, config
            tuning_enabled BOOLEAN DEFAULT FALSE, -- Can be automatically tuned
            auto_tuning_algorithm VARCHAR(50), -- Algorithm for auto-tuning
            
            -- Usage statistics
            access_count BIGINT DEFAULT 0, -- Number of times accessed
            modification_count BIGINT DEFAULT 0, -- Number of times modified
            last_accessed_at TIMESTAMP, -- Last time value was read
            last_modified_at TIMESTAMP, -- Last time value was changed
            
            -- Impact and dependencies
            dependent_settings VARCHAR(100)[], -- Settings that depend on this one
            affects_components TEXT[], -- System components affected by changes
            restart_required_components TEXT[], -- Components requiring restart
            performance_impact_level VARCHAR(20) DEFAULT 'low', -- Performance impact of changes
            
            -- Validation and testing
            test_value JSONB, -- Test value for validation
            validation_script VARCHAR(500), -- Script to validate setting
            health_check_enabled BOOLEAN DEFAULT FALSE, -- Include in health checks
            health_check_threshold JSONB, -- Thresholds for health checks
            
            -- Versioning and history
            version_number INTEGER DEFAULT 1, -- Version of this setting
            previous_value JSONB, -- Previous value before last change
            change_history JSONB DEFAULT '[]', -- History of changes
            configuration_hash VARCHAR(64), -- Hash of current configuration
            
            -- Lifecycle management
            deprecated BOOLEAN DEFAULT FALSE, -- Is this setting deprecated
            deprecation_date DATE, -- When it was deprecated
            removal_planned_date DATE, -- When it will be removed
            replacement_setting VARCHAR(100), -- Replacement setting if deprecated
            migration_script VARCHAR(500), -- Script for migrating to new setting
            
            -- Business context
            business_justification TEXT, -- Why this setting exists
            compliance_requirement VARCHAR(255), -- Regulatory requirement if applicable
            cost_impact VARCHAR(20) DEFAULT 'none', -- Cost impact: none, low, medium, high
            sla_impact VARCHAR(20) DEFAULT 'none', -- SLA impact level
            
            -- Status and state
            is_active BOOLEAN DEFAULT TRUE,
            is_system_setting BOOLEAN DEFAULT FALSE, -- Core system setting
            is_feature_flag BOOLEAN DEFAULT FALSE, -- Feature toggle
            feature_rollout_percentage INTEGER, -- For gradual feature rollout
            
            -- Metadata
            created_by UUID NOT NULL REFERENCES users(id),
            last_modified_by UUID REFERENCES users(id),
            tags TEXT[] DEFAULT '{}', -- Tags for categorization
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            effective_until TIMESTAMP,
        );


5. Advanced Search Infrastructure (3 tables)
    
    1. search_index

        CREATE TABLE search_index (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Entity identification
            entity_type VARCHAR(50) NOT NULL, -- thesis, academic_person, university, faculty, keyword, category, etc.
            entity_id UUID NOT NULL, -- ID of the entity in its respective table
            entity_table VARCHAR(50) NOT NULL, -- Table name where original entity exists
            
            -- Core searchable content
            title TEXT, -- Primary title/name of entity
            secondary_title TEXT, -- Alternative title/name
            content TEXT, -- Main content/description for search
            summary TEXT, -- Short summary for display
            
            -- Full-text search vectors (PostgreSQL tsvector)
            search_vector_en TSVECTOR, -- English full-text search vector
            search_vector_fr TSVECTOR, -- French full-text search vector
            search_vector_ar TSVECTOR, -- Arabic full-text search vector
            search_vector_multi TSVECTOR, -- Multi-language combined vector
            
            -- Structured searchable fields
            keywords TEXT[], -- Associated keywords for this entity
            tags TEXT[], -- Tags and categories
            authors TEXT[], -- Author names (for theses, publications)
            institutions TEXT[], -- Associated institutions
            locations TEXT[], -- Geographic locations
            languages TEXT[], -- Languages associated with entity
            
            -- Metadata for search context
            metadata JSONB DEFAULT '{}', -- Additional searchable metadata
            custom_fields JSONB DEFAULT '{}', -- Institution-specific searchable fields
            
            -- Search optimization
            boost_factor DECIMAL(5,2) DEFAULT 1.0, -- Search result boost (0.1-10.0)
            popularity_score DECIMAL(8,4) DEFAULT 0, -- Popularity-based ranking
            quality_score DECIMAL(5,2) DEFAULT 1.0, -- Quality-based ranking
            recency_score DECIMAL(5,2) DEFAULT 1.0, -- Recency-based ranking
            
            -- Search filtering attributes
            academic_level VARCHAR(30), -- undergraduate, graduate, doctoral
            publication_year INTEGER, -- Year of publication/defense
            language_primary VARCHAR(5) REFERENCES languages(code), -- Primary language
            access_level VARCHAR(20) DEFAULT 'public', -- public, restricted, private
            
            -- Geographic and institutional context
            university_id UUID REFERENCES universities(id),
            faculty_id UUID REFERENCES faculties(id),
            school_id UUID REFERENCES schools(id),
            department_id UUID REFERENCES departments(id),
            geographic_entity_id UUID REFERENCES geographic_entities(id),
            country_code VARCHAR(3), -- ISO country code
            
            -- Category classification
            primary_category_id UUID REFERENCES categories(id),
            secondary_categories UUID[], -- Additional categories
            study_design_id UUID REFERENCES study_designs(id),
            
            -- Content classification
            content_type VARCHAR(30), -- document, person, institution, concept
            document_format VARCHAR(20), -- pdf, docx, html, etc.
            content_length INTEGER, -- Character/word count
            has_full_text BOOLEAN DEFAULT FALSE, -- Full text available for search
            
            -- Authority and trust metrics
            citation_count INTEGER DEFAULT 0,
            view_count INTEGER DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            authority_score DECIMAL(5,2) DEFAULT 1.0, -- Domain authority score
            
            -- Search personalization data
            user_engagement_scores JSONB DEFAULT '{}', -- Per-user engagement metrics
            demographic_relevance JSONB DEFAULT '{}', -- Relevance by user demographics
            
            -- Index maintenance
            last_content_update TIMESTAMP, -- When source entity was last updated
            index_version INTEGER DEFAULT 1, -- Version of indexing algorithm used
            needs_reindex BOOLEAN DEFAULT FALSE, -- Needs reindexing
            index_priority INTEGER DEFAULT 100, -- Reindexing priority (higher = sooner)
            
            -- Search analytics integration
            search_appearance_count INTEGER DEFAULT 0, -- Times appeared in search results
            click_through_count INTEGER DEFAULT 0, -- Times clicked from search
            click_through_rate DECIMAL(5,4) DEFAULT 0, -- CTR (0-1)
            average_position DECIMAL(4,1), -- Average position in search results
            
            -- Content freshness and relevance
            content_freshness_score DECIMAL(3,2) DEFAULT 1.0, -- How fresh/current (0-1)
            seasonal_relevance JSONB DEFAULT '{}', -- Seasonal search patterns
            trending_score DECIMAL(8,4) DEFAULT 0, -- Current trending score
            
            -- Machine learning features
            ml_features JSONB DEFAULT '{}', -- ML model features for ranking
            embedding_vector FLOAT[], -- Semantic embedding vector (if using vector search)
            similarity_hash VARCHAR(64), -- Hash for near-duplicate detection
            
            -- Faceted search support
            facet_values JSONB DEFAULT '{}', -- Faceted search attribute values
            filterable_attributes TEXT[], -- Attributes that can be filtered on
            sortable_attributes TEXT[], -- Attributes that can be sorted by
            
            -- Access control and visibility
            visibility_rules JSONB DEFAULT '{}', -- Rules for who can see this in search
            embargo_until TIMESTAMP, -- Hidden from search until this date
            search_permissions TEXT[] DEFAULT ARRAY['public'], -- Who can find this in search
            
            -- External system integration
            external_ids JSONB DEFAULT '{}', -- IDs in external search systems
            sync_status VARCHAR(30) DEFAULT 'synced', -- synced, pending, failed, disabled
            last_external_sync TIMESTAMP, -- Last sync with external search engines
            
            -- Performance optimization
            search_frequency INTEGER DEFAULT 0, -- How often this entity is searched for
            cache_hit_rate DECIMAL(3,2), -- Cache performance for this entity
            search_complexity_score INTEGER DEFAULT 1, -- Complexity of searching this entity
            
            -- Status and lifecycle
            is_active BOOLEAN DEFAULT TRUE, -- Include in search results
            is_featured BOOLEAN DEFAULT FALSE, -- Featured/promoted content
            is_verified BOOLEAN DEFAULT FALSE, -- Verified/authoritative content
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_searched_at TIMESTAMP, -- Last time this appeared in search results
        );


    2. search_suggestions

        CREATE TABLE search_suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Suggestion identification and content
            suggestion TEXT UNIQUE NOT NULL, -- The actual suggestion text
            normalized_suggestion TEXT NOT NULL, -- Normalized version for matching
            suggestion_type VARCHAR(30) NOT NULL, -- autocomplete, spell_correction, related_query, trending
            
            -- Suggestion source and category
            category VARCHAR(50) NOT NULL, -- keyword, author, institution, title, general, location
            subcategory VARCHAR(50), -- thesis_title, person_name, university_name, etc.
            source_type VARCHAR(30) DEFAULT 'generated', -- user_query, entity_extraction, generated, imported
            
            -- Language and localization
            language VARCHAR(5) REFERENCES languages(code),
            language_variants JSONB DEFAULT '{}', -- Translations/variants in other languages
            is_multilingual BOOLEAN DEFAULT FALSE, -- Appears across multiple languages
            
            -- Usage and popularity metrics
            usage_count INTEGER DEFAULT 0, -- Total times this suggestion was used
            click_count INTEGER DEFAULT 0, -- Times users clicked on this suggestion
            impression_count INTEGER DEFAULT 0, -- Times suggestion was shown
            click_through_rate DECIMAL(5,4) DEFAULT 0, -- CTR (0-1)
            conversion_rate DECIMAL(5,4) DEFAULT 0, -- Rate of successful searches after using suggestion
            
            -- Temporal usage patterns
            daily_usage_avg DECIMAL(8,2) DEFAULT 0, -- Average daily usage
            weekly_usage_avg DECIMAL(8,2) DEFAULT 0, -- Average weekly usage
            monthly_usage_avg DECIMAL(8,2) DEFAULT 0, -- Average monthly usage
            last_used TIMESTAMP, -- Last time suggestion was used
            peak_usage_period VARCHAR(20), -- morning, afternoon, evening, night
            
            -- Quality and relevance scoring
            relevance_score DECIMAL(5,2) DEFAULT 1.0, -- How relevant (0.1-10.0)
            quality_score DECIMAL(5,2) DEFAULT 1.0, -- Overall quality (0.1-10.0)
            freshness_score DECIMAL(3,2) DEFAULT 1.0, -- How fresh/current (0-1)
            authority_score DECIMAL(5,2) DEFAULT 1.0, -- Authority/trust level (0.1-10.0)
            
            -- Context and targeting
            context_keywords TEXT[], -- Related keywords that trigger this suggestion
            target_audience VARCHAR(30), -- student, researcher, faculty, general
            academic_level VARCHAR(30), -- undergraduate, graduate, doctoral, all
            domain_expertise VARCHAR(30), -- beginner, intermediate, advanced, expert
            
            -- Geographic and institutional context
            geographic_relevance UUID[], -- Geographic regions where relevant
            institution_relevance UUID[], -- Institutions where this is relevant
            global_relevance BOOLEAN DEFAULT TRUE, -- Relevant globally or just locally
            
            -- Suggestion matching and triggering
            trigger_patterns TEXT[], -- Patterns that should trigger this suggestion
            minimum_prefix_length INTEGER DEFAULT 2, -- Minimum chars needed to trigger
            fuzzy_matching_enabled BOOLEAN DEFAULT TRUE, -- Allow fuzzy matching
            phonetic_matching_enabled BOOLEAN DEFAULT FALSE, -- Allow phonetic matching
            
            -- Related entities and content
            related_entity_type VARCHAR(50), -- Entity type this suggestion relates to
            related_entity_id UUID, -- Specific entity ID if applicable
            related_entities JSONB DEFAULT '{}', -- Multiple related entities
            result_count_estimate INTEGER, -- Estimated number of results
            
            -- Machine learning and AI
            ml_generated BOOLEAN DEFAULT FALSE, -- Generated by ML algorithm
            ml_model_version VARCHAR(20), -- ML model version that generated this
            ml_confidence DECIMAL(3,2), -- ML confidence in suggestion (0.01-1.00)
            embedding_vector FLOAT[], -- Semantic embedding for similarity matching
            similarity_suggestions UUID[], -- Similar suggestions
            
            -- Personalization
            user_personalization_enabled BOOLEAN DEFAULT TRUE,
            demographic_relevance JSONB DEFAULT '{}', -- Relevance by user demographics
            behavior_based_score DECIMAL(5,2) DEFAULT 1.0, -- Score based on user behavior patterns
            personalization_features JSONB DEFAULT '{}', -- Features for personalized ranking
            
            -- Trending and seasonality
            is_trending BOOLEAN DEFAULT FALSE,
            trending_score DECIMAL(8,4) DEFAULT 0, -- Current trending score
            seasonal_pattern VARCHAR(50), -- academic_year, semester, monthly, none
            seasonal_multiplier DECIMAL(3,2) DEFAULT 1.0, -- Seasonal boost factor
            trend_velocity DECIMAL(8,4) DEFAULT 0, -- Rate of trend change
            
            -- Suggestion enhancement
            alternative_phrasings TEXT[], -- Different ways to phrase the same suggestion
            synonyms TEXT[], -- Synonymous terms
            broader_terms TEXT[], -- More general terms
            narrower_terms TEXT[], -- More specific terms
            related_terms TEXT[], -- Related but not synonymous terms
            
            -- Spell correction and typo handling
            common_typos TEXT[], -- Common misspellings that should map to this
            correction_confidence DECIMAL(3,2), -- Confidence this is the right correction
            is_spell_correction BOOLEAN DEFAULT FALSE, -- Is this a spell correction
            original_misspelling TEXT, -- Original misspelled query if correction
            
            -- Query completion and prediction
            completion_priority INTEGER DEFAULT 100, -- Priority in autocomplete (higher = more important)
            auto_complete_enabled BOOLEAN DEFAULT TRUE, -- Show in autocomplete
            instant_search_enabled BOOLEAN DEFAULT FALSE, -- Enable instant search for this
            predictive_weight DECIMAL(3,2) DEFAULT 1.0, -- Weight in predictive algorithms
            
            -- Content and result metadata
            typical_result_types TEXT[], -- Types of results typically returned
            content_freshness VARCHAR(20) DEFAULT 'mixed', -- fresh, recent, mixed, historical
            result_diversity_score DECIMAL(3,2) DEFAULT 0.5, -- Diversity of typical results (0-1)
            average_result_quality DECIMAL(5,2), -- Average quality of results for this suggestion
            
            -- Business and promotional
            is_promoted BOOLEAN DEFAULT FALSE, -- Promoted suggestion
            promotion_priority INTEGER, -- Promotion priority level
            promotion_start_date TIMESTAMP, -- When promotion starts
            promotion_end_date TIMESTAMP, -- When promotion ends
            promotional_boost DECIMAL(3,2) DEFAULT 1.0, -- Promotional ranking boost
            
            -- External integration
            external_source VARCHAR(100), -- External system that provided suggestion
            external_id VARCHAR(255), -- ID in external system
            sync_enabled BOOLEAN DEFAULT FALSE, -- Sync with external source
            last_external_sync TIMESTAMP, -- Last sync with external source
            
            -- Quality control and moderation
            moderation_status VARCHAR(30) DEFAULT 'approved', -- approved, pending, rejected, flagged
            moderation_flags TEXT[], -- Content flags for moderation
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP,
            review_notes TEXT,
            
            -- A/B testing and experiments
            experiment_group VARCHAR(50), -- A/B test group
            test_variant VARCHAR(50), -- Specific variant being tested
            test_performance_metrics JSONB DEFAULT '{}', -- Performance in tests
            baseline_performance JSONB DEFAULT '{}', -- Baseline metrics for comparison
            
            -- Analytics and reporting
            conversion_funnel_data JSONB DEFAULT '{}', -- Detailed conversion tracking
            user_feedback_score DECIMAL(3,2), -- Average user feedback (1-5)
            user_feedback_count INTEGER DEFAULT 0, -- Number of feedback responses
            negative_feedback_count INTEGER DEFAULT 0, -- Negative feedback count
            
            -- Lifecycle and maintenance
            auto_generated BOOLEAN DEFAULT FALSE, -- Automatically generated
            manual_override BOOLEAN DEFAULT FALSE, -- Manual override of auto-generation
            requires_review BOOLEAN DEFAULT FALSE, -- Needs human review
            deprecation_candidate BOOLEAN DEFAULT FALSE, -- Candidate for removal
            
            -- Status and activation
            is_active BOOLEAN DEFAULT TRUE, -- Include in suggestions
            is_featured BOOLEAN DEFAULT FALSE, -- Featured in suggestion UI
            activation_date DATE DEFAULT CURRENT_DATE, -- When suggestion becomes active
            deactivation_date DATE, -- When to deactivate
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            first_used_at TIMESTAMP, -- First time used
            peak_usage_date TIMESTAMP, -- Date of peak usage
        );


    3. search_filters

        CREATE TABLE search_filters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            
            -- Search session context
            search_session_id UUID, -- Groups filters within same search session
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            search_query TEXT, -- Original search query these filters were applied to
            search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Filter identification
            filter_name VARCHAR(100), -- Human-readable filter name
            filter_type VARCHAR(50) NOT NULL, -- category, university, language, year, location, etc.
            filter_subtype VARCHAR(50), -- More specific filter classification
            
            -- Filter values and parameters
            filter_value TEXT NOT NULL, -- The actual filter value
            filter_value_normalized TEXT, -- Normalized version for analysis
            filter_label TEXT, -- Display label for UI
            filter_operator VARCHAR(20) DEFAULT 'equals', -- equals, contains, range, greater_than, less_than
            
            -- Multiple values and ranges
            filter_values TEXT[], -- Multiple values for multi-select filters
            range_min TEXT, -- Minimum value for range filters
            range_max TEXT, -- Maximum value for range filters
            numeric_min NUMERIC, -- Numeric minimum for calculations
            numeric_max NUMERIC, -- Numeric maximum for calculations
            
            -- Filter metadata
            filter_source VARCHAR(30) DEFAULT 'user', -- user, system, auto_applied, suggested, default
            application_method VARCHAR(30) DEFAULT 'manual', -- manual, auto_complete, suggestion, preset
            is_default_filter BOOLEAN DEFAULT FALSE, -- Is this a default system filter
            is_sticky_filter BOOLEAN DEFAULT FALSE, -- Should persist across searches
            
            -- Entity relationships (what this filter relates to)
            related_entity_type VARCHAR(50), -- thesis, person, institution, etc.
            related_entity_id UUID, -- Specific entity if applicable
            related_table_name VARCHAR(50), -- Database table this filter applies to
            related_column_name VARCHAR(50), -- Database column this filter applies to
            
            -- Filter effectiveness and results
            results_count INTEGER, -- Number of results with this filter applied
            results_count_without_filter INTEGER, -- Results without this filter
            filter_selectivity DECIMAL(5,4), -- How selective this filter is (0-1)
            results_quality_impact DECIMAL(3,2), -- Impact on result quality (+/- score)
            
            -- Usage patterns and analytics
            usage_frequency INTEGER DEFAULT 1, -- How often this filter combination is used
            co_occurrence_filters JSONB DEFAULT '[]', -- Other filters commonly used with this one
            sequential_position INTEGER, -- Order in which filter was applied in session
            filter_session_duration INTEGER, -- Milliseconds this filter was active
            
            -- User interaction tracking
            was_clicked BOOLEAN DEFAULT FALSE, -- Was this filter clicked/selected by user
            was_removed BOOLEAN DEFAULT FALSE, -- Was this filter removed during session
            was_modified BOOLEAN DEFAULT FALSE, -- Was this filter value modified
            interaction_time_ms INTEGER, -- Time user spent interacting with this filter
            
            -- Geographic and demographic context
            user_location_country VARCHAR(3), -- User's country when filter was applied
            user_location_city VARCHAR(100), -- User's city when filter was applied
            user_language_preference VARCHAR(5) REFERENCES languages(code),
            user_academic_level VARCHAR(30), -- User's academic level if known
            user_institution_id UUID REFERENCES universities(id), -- User's institution
            
            -- Device and platform context
            device_type VARCHAR(20), -- desktop, mobile, tablet
            browser_type VARCHAR(30), -- chrome, firefox, safari, etc.
            platform VARCHAR(20), -- web, mobile_app, api
            screen_resolution VARCHAR(20), -- 1920x1080, etc.
            
            -- Filter performance metrics
            application_time_ms INTEGER, -- Time to apply this filter
            results_load_time_ms INTEGER, -- Time to load results with filter
            perceived_performance VARCHAR(20) DEFAULT 'good', -- good, acceptable, slow, very_slow
            caused_timeout BOOLEAN DEFAULT FALSE, -- Did this filter cause query timeout
            
            -- A/B testing and experimentation
            experiment_group VARCHAR(50), -- A/B test group
            test_variant VARCHAR(50), -- Specific test variant
            is_control_group BOOLEAN DEFAULT FALSE, -- Is this the control group
            experiment_performance_impact DECIMAL(5,2), -- Performance impact of experiment
            
            -- Filter suggestions and recommendations
            was_suggested BOOLEAN DEFAULT FALSE, -- Was this filter suggested by system
            suggestion_algorithm VARCHAR(30), -- Algorithm that suggested this filter
            suggestion_confidence DECIMAL(3,2), -- Confidence in suggestion (0.01-1.00)
            accepted_suggestion BOOLEAN, -- Did user accept the suggestion
            suggestion_rejection_reason VARCHAR(50), -- Why suggestion was rejected
            
            -- Machine learning features
            ml_features JSONB DEFAULT '{}', -- Features for ML filter recommendation models
            user_profile_vector FLOAT[], -- User profile embedding for personalization
            filter_embedding_vector FLOAT[], -- Filter semantic embedding
            predicted_effectiveness DECIMAL(3,2), -- ML predicted effectiveness (0-1)
            
            -- Faceted search context
            facet_group VARCHAR(50), -- Which facet group this belongs to
            facet_display_order INTEGER, -- Order within facet group
            is_primary_facet BOOLEAN DEFAULT FALSE, -- Primary facet for this search
            facet_hierarchy_level INTEGER DEFAULT 1, -- Level in facet hierarchy
            parent_filter_id UUID REFERENCES search_filters(id), -- Parent facet if hierarchical
            
            -- Business intelligence and insights
            conversion_rate DECIMAL(5,4), -- Rate of successful searches with this filter
            user_satisfaction_score DECIMAL(3,2), -- User satisfaction (1-5) if available
            business_value_score DECIMAL(5,2), -- Business value of this filter application
            revenue_impact DECIMAL(10,2), -- Estimated revenue impact (if applicable)
            
            -- Filter validation and quality
            is_valid_filter BOOLEAN DEFAULT TRUE, -- Is this a valid filter value
            validation_errors TEXT[], -- Validation errors if any
            data_quality_score DECIMAL(3,2), -- Quality of filter data (0-1)
            requires_verification BOOLEAN DEFAULT FALSE, -- Needs manual verification
            
            -- Temporal patterns and seasonality
            is_seasonal_filter BOOLEAN DEFAULT FALSE, -- Shows seasonal usage patterns
            seasonal_pattern VARCHAR(30), -- academic_year, semester, monthly, weekly
            seasonal_relevance_score DECIMAL(3,2) DEFAULT 1.0, -- Seasonal relevance (0-1)
            time_of_day VARCHAR(20), -- morning, afternoon, evening, night
            day_of_week VARCHAR(10), -- monday, tuesday, etc.
            
            -- Personalization and preferences
            is_user_preference BOOLEAN DEFAULT FALSE, -- Saved as user preference
            preference_strength DECIMAL(3,2) DEFAULT 1.0, -- Strength of preference (0-1)
            learned_preference BOOLEAN DEFAULT FALSE, -- Learned from user behavior
            explicit_preference BOOLEAN DEFAULT FALSE, -- Explicitly set by user
            
            -- Search result impact analysis
            diversity_impact DECIMAL(3,2), -- Impact on result diversity (0-1)
            relevance_impact DECIMAL(3,2), -- Impact on result relevance (0-1)
            serendipity_impact DECIMAL(3,2), -- Impact on serendipitous discovery (0-1)
            coverage_impact DECIMAL(3,2), -- Impact on search coverage (0-1)
            
            -- External system integration
            external_filter_source VARCHAR(100), -- External system providing filter
            external_filter_id VARCHAR(255), -- ID in external system
            sync_required BOOLEAN DEFAULT FALSE, -- Needs sync with external system
            last_external_sync TIMESTAMP, -- Last sync with external source
            
            -- Filter lifecycle and management
            is_deprecated BOOLEAN DEFAULT FALSE, -- Filter is deprecated
            replacement_filter_id UUID REFERENCES search_filters(id), -- Replacement if deprecated
            deprecation_reason TEXT, -- Reason for deprecation
            auto_migration_available BOOLEAN DEFAULT FALSE, -- Can auto-migrate to replacement
            
            -- Privacy and compliance
            contains_pii BOOLEAN DEFAULT FALSE, -- Contains personally identifiable information
            gdpr_compliant BOOLEAN DEFAULT TRUE, -- GDPR compliant
            retention_policy VARCHAR(30) DEFAULT 'standard', -- standard, extended, minimal, purge
            anonymization_level VARCHAR(20) DEFAULT 'none', -- none, partial, full
            
            -- Status and flags
            is_active BOOLEAN DEFAULT TRUE,
            is_featured BOOLEAN DEFAULT FALSE, -- Featured in filter UI
            is_hidden BOOLEAN DEFAULT FALSE, -- Hidden from normal UI
            requires_permission BOOLEAN DEFAULT FALSE, -- Requires special permission to use
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            removed_at TIMESTAMP, -- When filter was removed from search
            expires_at TIMESTAMP, -- When this filter record expires
        );


6. Core User Interaction Tables (5 tables: feature)

    1. comments



    2. favorites


    
    3. downloads



    4. reports



    5. audit_logs


        