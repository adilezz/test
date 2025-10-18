-- ============================================================================
-- IMPROVED DATABASE STRUCTURE for theses.ma
-- Moroccan Thesis Repository
-- ============================================================================
-- This structure includes:
-- - Fixes for critical issues in current database
-- - All new tables for requested features
-- - Proper constraints, indexes, and cascade rules
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE thesis_status AS ENUM ('draft', 'pending', 'published', 'rejected');
CREATE TYPE academic_role AS ENUM ('author', 'supervisor', 'co_supervisor', 'examiner', 'president', 'co_examiner');
CREATE TYPE report_status AS ENUM ('open', 'in_review', 'resolved', 'dismissed');
CREATE TYPE report_type AS ENUM ('correction', 'metadata_error', 'copyright', 'inappropriate', 'duplicate');
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'medium', 'high', 'urgent');
CREATE TYPE notification_type AS ENUM ('thesis_status', 'new_thesis', 'comment', 'report', 'announcement', 'citation', 'follow', 'system');
CREATE TYPE activity_type AS ENUM ('login', 'logout', 'search', 'view', 'download', 'upload', 'edit', 'delete', 'comment', 'bookmark', 'follow', 'export');
CREATE TYPE collection_type AS ENUM ('special_issue', 'curated', 'event', 'award', 'featured');
CREATE TYPE announcement_type AS ENUM ('maintenance', 'feature', 'news', 'alert', 'update');
CREATE TYPE export_format AS ENUM ('bibtex', 'ris', 'endnote', 'json', 'xml');

-- ============================================================================
-- CORE ENTITY TABLES (IMPROVED)
-- ============================================================================

-- Languages
CREATE TABLE languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    rtl BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Geographic Entities
CREATE TABLE geographic_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(100),
    name_fr VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    parent_id UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
    level VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_geo_parent ON geographic_entities(parent_id);
CREATE INDEX idx_geo_level ON geographic_entities(level);

-- Universities
CREATE TABLE universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    acronym VARCHAR(20),
    geographic_entity_id UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
    website_url VARCHAR(255),
    founded_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_universities_geo ON universities(geographic_entity_id);
CREATE INDEX idx_universities_name ON universities(name_fr);

-- Faculties
CREATE TABLE faculties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    acronym VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_faculties_university ON faculties(university_id);

-- Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(500),
    name_fr VARCHAR(500) NOT NULL,
    name_ar VARCHAR(500),
    acronym VARCHAR(20),
    parent_university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    parent_school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_schools_university ON schools(parent_university_id);
CREATE INDEX idx_schools_parent ON schools(parent_school_id);

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    acronym VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (faculty_id IS NOT NULL OR school_id IS NOT NULL)
);
CREATE INDEX idx_departments_faculty ON departments(faculty_id);
CREATE INDEX idx_departments_school ON departments(school_id);

-- Degrees
CREATE TABLE degrees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    level INTEGER, -- 1=Bachelor, 2=Master, 3=Doctorate
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories (Research Disciplines)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_fr TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_code ON categories(code);

-- Keywords
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
    keyword_en VARCHAR(200),
    keyword_fr VARCHAR(200) NOT NULL,
    keyword_ar VARCHAR(200),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_keywords_category ON keywords(category_id);
CREATE INDEX idx_keywords_fr ON keywords(keyword_fr);
CREATE INDEX idx_keywords_usage ON keywords(usage_count DESC);

-- Research Methodologies
CREATE TABLE research_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_fr TEXT,
    parent_id UUID REFERENCES research_methodologies(id) ON DELETE SET NULL,
    methodology_type VARCHAR(50), -- 'quantitative', 'qualitative', 'mixed', 'experimental', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_methodologies_parent ON research_methodologies(parent_id);

-- ============================================================================
-- USER MANAGEMENT (IMPROVED)
-- ============================================================================

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    orcid VARCHAR(19),
    google_scholar_id VARCHAR(100),
    linkedin_url VARCHAR(255),
    website_url VARCHAR(255),
    university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    phone VARCHAR(30),
    alternative_email VARCHAR(255),
    language VARCHAR(5) DEFAULT 'fr',
    timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
    role user_role DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_users_active ON users(is_active, created_at DESC);

-- User Publications
CREATE TABLE user_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    publication_type VARCHAR(50), -- 'journal', 'conference', 'book', 'chapter', 'thesis'
    authors TEXT,
    publication_date DATE,
    journal_name VARCHAR(255),
    conference_name VARCHAR(255),
    publisher VARCHAR(255),
    doi VARCHAR(100),
    isbn VARCHAR(13),
    url VARCHAR(500),
    citation_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_publications_user ON user_publications(user_id);

-- User Research Interests
CREATE TABLE user_research_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    interest_level INTEGER DEFAULT 5, -- 1-10 scale
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, keyword_id)
);
CREATE INDEX idx_research_interests_user ON user_research_interests(user_id);

-- User Activity Logs
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type activity_type NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_user_date ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_type ON user_activity_logs(activity_type, created_at DESC);

-- User Bookmarks
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    notes TEXT,
    folder_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, thesis_id)
);
CREATE INDEX idx_bookmarks_user ON user_bookmarks(user_id, created_at DESC);

-- User Follows
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_type VARCHAR(20) NOT NULL, -- 'user', 'researcher', 'keyword', 'category'
    following_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_type, following_id)
);
CREATE INDEX idx_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_follows_following ON user_follows(following_type, following_id);

-- ============================================================================
-- ACADEMIC PERSONS
-- ============================================================================

CREATE TABLE academic_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complete_name_fr VARCHAR(200),
    complete_name_ar VARCHAR(200),
    first_name_fr VARCHAR(100),
    last_name_fr VARCHAR(100),
    first_name_ar VARCHAR(100),
    last_name_ar VARCHAR(100),
    first_name_en VARCHAR(100),
    last_name_en VARCHAR(100),
    title VARCHAR(100),
    university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    external_institution_name VARCHAR(255),
    external_institution_country VARCHAR(100),
    external_institution_type VARCHAR(50),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    orcid VARCHAR(19),
    email VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_academic_persons_name ON academic_persons(complete_name_fr);
CREATE INDEX idx_academic_persons_university ON academic_persons(university_id);
CREATE INDEX idx_academic_persons_user ON academic_persons(user_id);

-- ============================================================================
-- THESES (IMPROVED)
-- ============================================================================

CREATE TABLE theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(500),
    title_fr VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    abstract_en TEXT,
    abstract_fr TEXT NOT NULL,
    abstract_ar TEXT,
    university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
    faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    degree_id UUID REFERENCES degrees(id) ON DELETE SET NULL,
    thesis_number VARCHAR(100),
    study_location_id UUID REFERENCES geographic_entities(id) ON DELETE SET NULL,
    defense_date DATE NOT NULL,
    defense_year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM defense_date)) STORED,
    language_id UUID NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
    page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
    isbn VARCHAR(13),
    doi VARCHAR(100),
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_mb NUMERIC(10,2),
    status thesis_status DEFAULT 'draft',
    submitted_at TIMESTAMP,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMP,
    citation_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    export_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP,
    last_downloaded_at TIMESTAMP,
    metadata_completeness_score NUMERIC(3,2),
    extraction_job_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (defense_date <= CURRENT_DATE + INTERVAL '1 year')
);
CREATE INDEX idx_theses_status ON theses(status, created_at DESC);
CREATE INDEX idx_theses_defense_date ON theses(defense_date DESC);
CREATE INDEX idx_theses_defense_year ON theses(defense_year DESC);
CREATE INDEX idx_theses_university ON theses(university_id);
CREATE INDEX idx_theses_degree ON theses(degree_id);
CREATE INDEX idx_theses_language ON theses(language_id);
CREATE INDEX idx_theses_featured ON theses(is_featured, featured_until);
CREATE INDEX idx_theses_fulltext_title ON theses USING gin(to_tsvector('french', title_fr));
CREATE INDEX idx_theses_fulltext_abstract ON theses USING gin(to_tsvector('french', abstract_fr));

-- Thesis Languages (Secondary Languages)
CREATE TABLE thesis_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, language_id)
);

-- Thesis Academic Persons (FIXED)
CREATE TABLE thesis_academic_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES academic_persons(id) ON DELETE CASCADE,
    role academic_role NOT NULL,
    role_order INTEGER DEFAULT 0,
    faculty_id UUID REFERENCES faculties(id) ON DELETE SET NULL,
    is_external BOOLEAN DEFAULT false,
    external_institution_name VARCHAR(255),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, person_id, role)
);
CREATE INDEX idx_thesis_persons_thesis ON thesis_academic_persons(thesis_id);
CREATE INDEX idx_thesis_persons_person ON thesis_academic_persons(person_id);
CREATE INDEX idx_thesis_persons_role ON thesis_academic_persons(role);

-- Thesis Categories
CREATE TABLE thesis_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    confidence_score NUMERIC(5,4),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, category_id)
);
CREATE INDEX idx_thesis_categories_thesis ON thesis_categories(thesis_id);
CREATE INDEX idx_thesis_categories_category ON thesis_categories(category_id);

-- Thesis Keywords
CREATE TABLE thesis_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    keyword_position INTEGER,
    frequency_count INTEGER DEFAULT 0,
    relevance_score NUMERIC(5,4),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, keyword_id)
);
CREATE INDEX idx_thesis_keywords_thesis ON thesis_keywords(thesis_id);
CREATE INDEX idx_thesis_keywords_keyword ON thesis_keywords(keyword_id);

-- Thesis Methodologies
CREATE TABLE thesis_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    methodology_id UUID NOT NULL REFERENCES research_methodologies(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, methodology_id)
);
CREATE INDEX idx_thesis_methodologies_thesis ON thesis_methodologies(thesis_id);

-- Thesis Awards
CREATE TABLE thesis_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    award_name_fr VARCHAR(255) NOT NULL,
    award_name_en VARCHAR(255),
    award_name_ar VARCHAR(255),
    awarding_organization VARCHAR(255),
    award_date DATE,
    award_level VARCHAR(50), -- 'university', 'national', 'international'
    award_category VARCHAR(50),
    description TEXT,
    prize_amount NUMERIC(10,2),
    currency VARCHAR(3),
    certificate_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_awards_thesis ON thesis_awards(thesis_id);

-- ============================================================================
-- CITATIONS & RECOMMENDATIONS
-- ============================================================================

-- Citations
CREATE TABLE thesis_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citing_thesis_id UUID REFERENCES theses(id) ON DELETE CASCADE,
    cited_thesis_id UUID REFERENCES theses(id) ON DELETE CASCADE,
    citation_type VARCHAR(50) DEFAULT 'reference',
    external_citation_text TEXT,
    external_authors TEXT,
    external_title VARCHAR(500),
    external_year INTEGER,
    external_doi VARCHAR(100),
    page_numbers VARCHAR(50),
    citation_context TEXT,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (citing_thesis_id IS NOT NULL OR cited_thesis_id IS NOT NULL)
);
CREATE INDEX idx_citations_citing ON thesis_citations(citing_thesis_id);
CREATE INDEX idx_citations_cited ON thesis_citations(cited_thesis_id);

-- Similar Theses
CREATE TABLE thesis_similarities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    similar_thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,4) NOT NULL,
    similarity_type VARCHAR(50), -- 'content', 'keywords', 'category', 'ml_model'
    model_version VARCHAR(50),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, similar_thesis_id),
    CHECK (thesis_id != similar_thesis_id),
    CHECK (similarity_score >= 0 AND similarity_score <= 1)
);
CREATE INDEX idx_similarities_thesis ON thesis_similarities(thesis_id, similarity_score DESC);

-- ============================================================================
-- COLLECTIONS
-- ============================================================================

-- Thesis Collections
CREATE TABLE thesis_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_en TEXT,
    description_fr TEXT,
    description_ar TEXT,
    collection_type collection_type,
    curator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    cover_image_url VARCHAR(500),
    slug VARCHAR(255) UNIQUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_collections_type ON thesis_collections(collection_type);
CREATE INDEX idx_collections_curator ON thesis_collections(curator_id);

-- Collection Theses
CREATE TABLE collection_theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES thesis_collections(id) ON DELETE CASCADE,
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    featured_text TEXT,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, thesis_id)
);
CREATE INDEX idx_collection_theses_collection ON collection_theses(collection_id, display_order);

-- ============================================================================
-- COMMENTS & ENGAGEMENT
-- ============================================================================

-- Thesis Comments
CREATE TABLE thesis_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES thesis_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_annotation BOOLEAN DEFAULT false,
    annotation_page INTEGER,
    annotation_quote TEXT,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP,
    moderation_reason TEXT,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comments_thesis ON thesis_comments(thesis_id, created_at DESC);
CREATE INDEX idx_comments_user ON thesis_comments(user_id);
CREATE INDEX idx_comments_parent ON thesis_comments(parent_comment_id);

-- Comment Reactions
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES thesis_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL DEFAULT 'like',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id, reaction_type)
);
CREATE INDEX idx_reactions_comment ON comment_reactions(comment_id);

-- ============================================================================
-- REPORTS & MODERATION
-- ============================================================================

-- Thesis Reports
CREATE TABLE thesis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type report_type NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status report_status DEFAULT 'open',
    priority priority_level DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reports_status ON thesis_reports(status, priority, created_at DESC);
CREATE INDEX idx_reports_thesis ON thesis_reports(thesis_id);
CREATE INDEX idx_reports_assigned ON thesis_reports(assigned_to);

-- ============================================================================
-- ANALYTICS & TRACKING
-- ============================================================================

-- Thesis Views
CREATE TABLE thesis_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    view_duration INTEGER,
    referrer_url VARCHAR(500),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_views_thesis_date ON thesis_views(thesis_id, viewed_at DESC);
CREATE INDEX idx_views_user ON thesis_views(user_id, viewed_at DESC);

-- Thesis Downloads
CREATE TABLE thesis_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    download_type VARCHAR(20) DEFAULT 'full',
    referrer_url VARCHAR(500),
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_downloads_thesis_date ON thesis_downloads(thesis_id, downloaded_at DESC);
CREATE INDEX idx_downloads_user ON thesis_downloads(user_id, downloaded_at DESC);

-- Thesis Exports
CREATE TABLE thesis_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    export_format export_format NOT NULL,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exports_thesis ON thesis_exports(thesis_id, created_at DESC);

-- ============================================================================
-- SEARCH & DISCOVERY
-- ============================================================================

-- Saved Searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_query JSONB NOT NULL,
    is_alert_enabled BOOLEAN DEFAULT false,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    last_alerted_at TIMESTAMP,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alerts ON saved_searches(is_alert_enabled, alert_frequency);

-- Search History
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    search_query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    session_id VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);
CREATE INDEX idx_search_history_query ON search_history USING gin(to_tsvector('french', search_query));

-- ============================================================================
-- NOTIFICATIONS & ANNOUNCEMENTS
-- ============================================================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    entity_type VARCHAR(50),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    priority priority_level DEFAULT 'normal',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(notification_type, created_at DESC);

-- System Announcements
CREATE TABLE system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(255),
    title_fr VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    content_en TEXT,
    content_fr TEXT NOT NULL,
    content_ar TEXT,
    announcement_type announcement_type,
    priority priority_level DEFAULT 'normal',
    target_audience VARCHAR(50) DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    show_banner BOOLEAN DEFAULT false,
    publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_announcements_active ON system_announcements(is_active, publish_at DESC);

-- ============================================================================
-- RANKINGS & TRENDING
-- ============================================================================

-- Trending Topics
CREATE TABLE trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    time_period VARCHAR(20) NOT NULL,
    search_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    thesis_count INTEGER DEFAULT 0,
    trend_score NUMERIC(10,2),
    rank_position INTEGER,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (keyword_id IS NOT NULL OR category_id IS NOT NULL)
);
CREATE INDEX idx_trending_period ON trending_topics(time_period, trend_score DESC, rank_position);

-- Institution Rankings
CREATE TABLE institution_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE,
    ranking_type VARCHAR(50) NOT NULL,
    time_period VARCHAR(20) NOT NULL,
    rank_position INTEGER,
    total_theses INTEGER DEFAULT 0,
    total_citations INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    average_citations NUMERIC(10,2),
    h_index INTEGER DEFAULT 0,
    score NUMERIC(10,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (university_id IS NOT NULL OR faculty_id IS NOT NULL)
);
CREATE INDEX idx_rankings_institution ON institution_rankings(ranking_type, time_period, rank_position);

-- Researcher Rankings
CREATE TABLE researcher_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    researcher_id UUID NOT NULL REFERENCES academic_persons(id) ON DELETE CASCADE,
    ranking_type VARCHAR(50) NOT NULL,
    time_period VARCHAR(20) NOT NULL,
    rank_position INTEGER,
    thesis_count INTEGER DEFAULT 0,
    supervision_count INTEGER DEFAULT 0,
    total_citations INTEGER DEFAULT 0,
    h_index INTEGER DEFAULT 0,
    i10_index INTEGER DEFAULT 0,
    score NUMERIC(10,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rankings_researcher ON researcher_rankings(ranking_type, time_period, rank_position);

-- ============================================================================
-- BULK UPLOAD & JOBS
-- ============================================================================

-- Bulk Upload Batches
CREATE TABLE bulk_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_name VARCHAR(255),
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    successful_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    metadata_source VARCHAR(50),
    metadata_file_url VARCHAR(500),
    error_log JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bulk_uploads_user ON bulk_upload_batches(uploaded_by, created_at DESC);

-- Bulk Upload Files
CREATE TABLE bulk_upload_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES bulk_upload_batches(id) ON DELETE CASCADE,
    thesis_id UUID REFERENCES theses(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bulk_files_batch ON bulk_upload_files(batch_id);

-- ============================================================================
-- AI/ML FEATURES
-- ============================================================================

-- ML Models
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    accuracy_score NUMERIC(5,4),
    precision_score NUMERIC(5,4),
    recall_score NUMERIC(5,4),
    f1_score NUMERIC(5,4),
    training_date DATE,
    deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (model_name, model_version)
);

-- AI Auto-Categorization
CREATE TABLE thesis_auto_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    confidence_score NUMERIC(5,4) NOT NULL,
    model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
    is_accepted BOOLEAN DEFAULT false,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auto_categories_thesis ON thesis_auto_categories(thesis_id, confidence_score DESC);

-- AI-Generated Summaries
CREATE TABLE thesis_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    summary_type VARCHAR(50) NOT NULL,
    summary_text TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
    quality_score NUMERIC(5,4),
    word_count INTEGER,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, summary_type, language_code)
);
CREATE INDEX idx_summaries_thesis ON thesis_summaries(thesis_id);

-- ============================================================================
-- END OF DATABASE STRUCTURE
-- ============================================================================

