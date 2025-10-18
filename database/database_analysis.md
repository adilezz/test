# Database Structure Analysis & Improvement Plan
## theses.ma - Moroccan Thesis Repository

---

## 🔴 CRITICAL ISSUES IN CURRENT DATABASE

### 1. **SEVERE: thesis_academic_persons Table - Wrong UNIQUE Constraints**
**Current (BROKEN):**
```sql
UNIQUE (thesis_id),
UNIQUE (person_id),
UNIQUE (role)
```

**Problem:** This means:
- Each thesis can only have ONE person total (any role)
- Each person can only appear in ONE thesis ever
- Each role can only exist ONCE in the entire system

**Impact:** You cannot have multiple authors, supervisors, or examiners for any thesis!

**Fix:** Should be:
```sql
UNIQUE (thesis_id, person_id, role)
```

---

### 2. **keywords Table - Ambiguous UNIQUE Constraints**
**Current:**
```sql
UNIQUE (keyword_en),
UNIQUE (keyword_fr),
UNIQUE (keyword_ar)
```

**Problem:** 
- If a keyword exists only in French, no other keyword can use that French text
- Cannot have multilingual variations properly
- NULL values complicate uniqueness

**Better Approach:** Consider case-insensitive uniqueness per language or composite approach

---

### 3. **languages Table - Missing code UNIQUE Constraint**
**Current:** Only `id` is primary key, but `code` (e.g., 'fr', 'en', 'ar') has no uniqueness

**Fix:** Add `UNIQUE (code)` or make `code` the primary key

---

### 4. **Missing Cascade Rules**
**Problem:** No `ON DELETE CASCADE` or `ON DELETE SET NULL` specified

**Impact:** 
- Orphaned records when parent entities are deleted
- Database integrity issues
- Manual cleanup required

**Example:** If a university is deleted, what happens to its faculties, departments, users, and theses?

---

### 5. **Missing Indexes**
**Problem:** No explicit indexes on foreign keys or frequently searched columns

**Impact:**
- Slow search queries
- Poor performance on joins
- Slow filtering and sorting

---

### 6. **Data Type Issues**

#### a) **VARCHAR Limits Too Small:**
- `users.first_name` & `last_name`: VARCHAR(20) - Many names are longer
- `users.phone`: VARCHAR(20) - International format needs more
- `academic_persons.title`: VARCHAR(10) - "Professor" is already 9 chars

#### b) **Missing ENUM Types:**
- `users.role`: Should be ENUM('user', 'moderator', 'admin', 'super_admin')
- `theses.status`: Should be ENUM('draft', 'pending', 'published', 'rejected')
- `thesis_academic_persons.role`: Should be ENUM('author', 'supervisor', 'co_supervisor', 'examiner', 'president')

#### c) **ARRAY Usage:**
- `theses.secondary_language_ids`: ARRAY type - Consider junction table instead for better querying

---

### 7. **Missing CHECK Constraints**
- No validation on email format
- No validation on date ranges (defense_date should be in the past)
- No validation on status transitions

---

## 🟡 MISSING FEATURES (Based on Requirements)

### **User Management & Profiles**
❌ User profiles (CV, bio, ORCID)
❌ User publications tracking
❌ Research interests
❌ User activity logs
❌ Moderator role support

### **Thesis Workflow**
❌ Reports/correction requests system
❌ Bulk upload tracking
❌ Workflow audit trail

### **Search & Discovery**
❌ Saved searches
❌ Search alerts
❌ Similar thesis recommendations
❌ Citation network

### **Academic Features**
❌ Citation tracking (separate from downloads)
❌ Bibliography export tracking
❌ Collections/special issues
❌ Research methodology classification
❌ Awards and distinctions

### **Social & Engagement**
❌ User comments/annotations
❌ Rating/reaction system
❌ Bookmarks/favorites
❌ Follow system (researchers, topics)

### **Communication**
❌ Notification system
❌ Announcements

### **Analytics**
❌ Trending topics calculation
❌ Institution rankings
❌ Researcher rankings
❌ Geographic distribution analytics

### **AI/ML Support**
❌ Auto-categorization results storage
❌ Similarity scores
❌ ML model metadata

---

## ✅ PROPOSED DATABASE IMPROVEMENTS

### **A. Fix Existing Tables**

#### 1. Fix thesis_academic_persons
```sql
-- Remove wrong UNIQUE constraints
-- Add proper composite unique
UNIQUE (thesis_id, person_id, role)
```

#### 2. Improve users table
```sql
ALTER TABLE users
  ALTER COLUMN first_name TYPE VARCHAR(100),
  ALTER COLUMN last_name TYPE VARCHAR(100),
  ALTER COLUMN phone TYPE VARCHAR(30),
  ADD COLUMN bio TEXT,
  ADD COLUMN avatar_url VARCHAR(500),
  ADD COLUMN orcid VARCHAR(19),
  ADD COLUMN google_scholar_id VARCHAR(100),
  ADD COLUMN linkedin_url VARCHAR(255),
  ADD COLUMN website_url VARCHAR(255),
  ADD COLUMN last_login_at TIMESTAMP,
  ADD COLUMN login_count INTEGER DEFAULT 0;
```

#### 3. Add proper ENUMs
```sql
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE thesis_status AS ENUM ('draft', 'pending', 'published', 'rejected');
CREATE TYPE academic_role AS ENUM ('author', 'supervisor', 'co_supervisor', 'examiner', 'president', 'co_examiner');
CREATE TYPE report_status AS ENUM ('open', 'in_review', 'resolved', 'dismissed');
CREATE TYPE notification_type AS ENUM ('thesis_status', 'new_thesis', 'comment', 'report', 'announcement', 'citation', 'system');
CREATE TYPE activity_type AS ENUM ('login', 'logout', 'search', 'view', 'download', 'upload', 'edit', 'delete', 'comment', 'bookmark');
```

---

### **B. New Tables to Add**

#### **1. User Profile & Social**

```sql
-- User research interests (many-to-many with keywords)
CREATE TABLE user_research_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, keyword_id)
);

-- User publications
CREATE TABLE user_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    publication_type VARCHAR(50), -- journal, conference, book, chapter
    authors TEXT,
    publication_date DATE,
    journal_name VARCHAR(255),
    doi VARCHAR(100),
    url VARCHAR(500),
    citation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User follows (follow researchers or topics)
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_type VARCHAR(20) NOT NULL, -- 'user', 'keyword', 'category'
    following_id UUID NOT NULL, -- user_id, keyword_id, or category_id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, following_type, following_id)
);

-- User bookmarks
CREATE TABLE user_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, thesis_id)
);

-- User activity logs
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- 'thesis', 'user', 'search', etc.
    entity_id UUID,
    metadata JSONB, -- flexible storage for activity details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_user_date ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_type ON user_activity_logs(activity_type, created_at DESC);
```

#### **2. Thesis Reports & Corrections**

```sql
-- Reports for corrections/issues
CREATE TABLE thesis_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- 'correction', 'metadata_error', 'copyright', 'inappropriate'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reports_status ON thesis_reports(status, created_at DESC);
CREATE INDEX idx_reports_thesis ON thesis_reports(thesis_id);
```

#### **3. Search & Discovery**

```sql
-- Saved searches
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_query JSONB NOT NULL, -- stores search parameters
    is_alert_enabled BOOLEAN DEFAULT false,
    alert_frequency VARCHAR(20), -- 'immediate', 'daily', 'weekly'
    last_alerted_at TIMESTAMP,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Search history (for analytics)
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
```

#### **4. Citations & Recommendations**

```sql
-- Citation tracking
CREATE TABLE thesis_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citing_thesis_id UUID REFERENCES theses(id) ON DELETE CASCADE,
    cited_thesis_id UUID REFERENCES theses(id) ON DELETE CASCADE,
    citation_type VARCHAR(50) DEFAULT 'reference', -- 'reference', 'external', 'footnote'
    external_citation_text TEXT, -- if citing external work
    external_doi VARCHAR(100),
    page_numbers VARCHAR(50),
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (citing_thesis_id IS NOT NULL OR external_citation_text IS NOT NULL)
);
CREATE INDEX idx_citations_citing ON thesis_citations(citing_thesis_id);
CREATE INDEX idx_citations_cited ON thesis_citations(cited_thesis_id);

-- Similar theses (for recommendations)
CREATE TABLE thesis_similarities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    similar_thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5,4), -- 0.0000 to 1.0000
    similarity_type VARCHAR(50), -- 'content', 'keywords', 'category', 'ml_model'
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, similar_thesis_id),
    CHECK (thesis_id != similar_thesis_id)
);
CREATE INDEX idx_similarities_thesis ON thesis_similarities(thesis_id, similarity_score DESC);
```

#### **5. Collections & Methodologies**

```sql
-- Research methodologies
CREATE TABLE research_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_fr TEXT,
    parent_id UUID REFERENCES research_methodologies(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thesis methodologies (many-to-many)
CREATE TABLE thesis_methodologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    methodology_id UUID NOT NULL REFERENCES research_methodologies(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thesis_id, methodology_id)
);

-- Thesis collections
CREATE TABLE thesis_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255),
    name_fr VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_fr TEXT,
    collection_type VARCHAR(50), -- 'special_issue', 'curated', 'event', 'award'
    curator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT true,
    cover_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection theses (many-to-many)
CREATE TABLE collection_theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES thesis_collections(id) ON DELETE CASCADE,
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (collection_id, thesis_id)
);

-- Thesis awards
CREATE TABLE thesis_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    award_name_fr VARCHAR(255) NOT NULL,
    award_name_en VARCHAR(255),
    awarding_organization VARCHAR(255),
    award_date DATE,
    award_level VARCHAR(50), -- 'university', 'national', 'international'
    description TEXT,
    certificate_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **6. Comments & Engagement**

```sql
-- Thesis comments
CREATE TABLE thesis_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES thesis_comments(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    is_annotation BOOLEAN DEFAULT false, -- true if annotating specific part
    annotation_page INTEGER, -- page number if annotation
    annotation_quote TEXT, -- quoted text if annotation
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at TIMESTAMP,
    moderation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comments_thesis ON thesis_comments(thesis_id, created_at DESC);
CREATE INDEX idx_comments_user ON thesis_comments(user_id);

-- Comment reactions
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES thesis_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL, -- 'like', 'helpful', 'insightful'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id, reaction_type)
);
```

#### **7. Notifications & Announcements**

```sql
-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(500),
    entity_type VARCHAR(50), -- 'thesis', 'comment', 'report', etc.
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- System announcements
CREATE TABLE system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en VARCHAR(255),
    title_fr VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    content_en TEXT,
    content_fr TEXT NOT NULL,
    content_ar TEXT,
    announcement_type VARCHAR(50), -- 'maintenance', 'feature', 'news', 'alert'
    priority VARCHAR(20) DEFAULT 'normal',
    target_audience VARCHAR(50) DEFAULT 'all', -- 'all', 'users', 'admins', 'researchers'
    is_active BOOLEAN DEFAULT true,
    show_banner BOOLEAN DEFAULT false,
    publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_at TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_announcements_active ON system_announcements(is_active, publish_at DESC);
```

#### **8. Analytics & Rankings**

```sql
-- Bibliography exports tracking
CREATE TABLE thesis_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    export_format VARCHAR(20) NOT NULL, -- 'bibtex', 'ris', 'endnote', 'json'
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_exports_thesis ON thesis_exports(thesis_id, created_at DESC);

-- Trending topics (calculated periodically)
CREATE TABLE trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    time_period VARCHAR(20) NOT NULL, -- 'day', 'week', 'month', 'year'
    search_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    thesis_count INTEGER DEFAULT 0,
    trend_score NUMERIC(10,2),
    rank_position INTEGER,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (keyword_id, time_period, period_start),
    UNIQUE (category_id, time_period, period_start),
    CHECK (keyword_id IS NOT NULL OR category_id IS NOT NULL)
);
CREATE INDEX idx_trending_period ON trending_topics(time_period, trend_score DESC);

-- Institution rankings
CREATE TABLE institution_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    faculty_id UUID REFERENCES faculties(id) ON DELETE CASCADE,
    ranking_type VARCHAR(50) NOT NULL, -- 'thesis_count', 'citations', 'downloads', 'quality'
    time_period VARCHAR(20) NOT NULL,
    rank_position INTEGER,
    total_theses INTEGER DEFAULT 0,
    total_citations INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    average_citations NUMERIC(10,2),
    score NUMERIC(10,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (university_id IS NOT NULL OR faculty_id IS NOT NULL)
);
CREATE INDEX idx_rankings_institution ON institution_rankings(ranking_type, time_period, rank_position);

-- Researcher rankings
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
    score NUMERIC(10,2),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rankings_researcher ON researcher_rankings(ranking_type, time_period, rank_position);
```

#### **9. Bulk Upload & Job Tracking**

```sql
-- Bulk upload batches
CREATE TABLE bulk_upload_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_name VARCHAR(255),
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    successful_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    metadata_source VARCHAR(50), -- 'manual', 'auto_extract', 'csv', 'excel'
    metadata_file_url VARCHAR(500),
    error_log JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_bulk_uploads_user ON bulk_upload_batches(uploaded_by, created_at DESC);

-- Individual files in bulk uploads
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
```

#### **10. AI/ML Features**

```sql
-- ML model metadata
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'extraction', 'classification', 'similarity', 'summarization'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    accuracy_score NUMERIC(5,4),
    deployed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (model_name, model_version)
);

-- AI auto-categorization results
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

-- AI-generated summaries
CREATE TABLE thesis_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE CASCADE,
    summary_type VARCHAR(50) NOT NULL, -- 'short', 'long', 'technical', 'general'
    summary_text TEXT NOT NULL,
    language_code VARCHAR(5) NOT NULL,
    model_id UUID REFERENCES ml_models(id) ON DELETE SET NULL,
    quality_score NUMERIC(5,4),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📊 RECOMMENDED INDEXES

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_users_active ON users(is_active, created_at DESC);

-- Theses
CREATE INDEX idx_theses_status ON theses(status, created_at DESC);
CREATE INDEX idx_theses_defense_date ON theses(defense_date DESC);
CREATE INDEX idx_theses_university ON theses(university_id);
CREATE INDEX idx_theses_category ON theses(degree_id);
CREATE INDEX idx_theses_language ON theses(language_id);
CREATE INDEX idx_theses_fulltext_title ON theses USING gin(to_tsvector('french', title_fr));
CREATE INDEX idx_theses_fulltext_abstract ON theses USING gin(to_tsvector('french', abstract_fr));

-- Academic persons
CREATE INDEX idx_academic_persons_name ON academic_persons(complete_name_fr);
CREATE INDEX idx_academic_persons_university ON academic_persons(university_id);
CREATE INDEX idx_academic_persons_user ON academic_persons(user_id);

-- Keywords & Categories
CREATE INDEX idx_keywords_category ON keywords(category_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_code ON categories(code);

-- Geographic entities
CREATE INDEX idx_geo_parent ON geographic_entities(parent_id);
CREATE INDEX idx_geo_level ON geographic_entities(level);

-- Downloads & Views
CREATE INDEX idx_downloads_thesis_date ON thesis_downloads(thesis_id, downloaded_at DESC);
CREATE INDEX idx_views_thesis_date ON thesis_views(thesis_id, viewed_at DESC);
```

---

## 🔧 RECOMMENDED MODIFICATIONS TO EXISTING TABLES

### 1. Add CASCADE rules
```sql
-- Example: faculties should cascade to departments
ALTER TABLE departments
    DROP CONSTRAINT departments_faculty_id_fkey,
    ADD CONSTRAINT departments_faculty_id_fkey 
        FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE;
```

### 2. Add CHECK constraints
```sql
-- Validate email format
ALTER TABLE users ADD CONSTRAINT check_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Defense date should be in the past or near future
ALTER TABLE theses ADD CONSTRAINT check_defense_date 
    CHECK (defense_date <= CURRENT_DATE + INTERVAL '1 year');

-- Page count should be positive
ALTER TABLE theses ADD CONSTRAINT check_page_count 
    CHECK (page_count IS NULL OR page_count > 0);
```

### 3. Add missing fields to theses
```sql
ALTER TABLE theses
    ADD COLUMN isbn VARCHAR(13),
    ADD COLUMN doi VARCHAR(100),
    ADD COLUMN citation_count INTEGER DEFAULT 0,
    ADD COLUMN view_count INTEGER DEFAULT 0,
    ADD COLUMN download_count INTEGER DEFAULT 0,
    ADD COLUMN last_viewed_at TIMESTAMP,
    ADD COLUMN last_downloaded_at TIMESTAMP,
    ADD COLUMN metadata_completeness_score NUMERIC(3,2), -- 0.00 to 1.00
    ADD COLUMN is_featured BOOLEAN DEFAULT false,
    ADD COLUMN featured_until TIMESTAMP;
```

---

## 📝 MIGRATION STRATEGY

### Phase 1: Fix Critical Issues (URGENT)
1. Fix `thesis_academic_persons` UNIQUE constraints
2. Add missing indexes on foreign keys
3. Add CASCADE rules

### Phase 2: User Management Enhancement
1. Add user profile fields
2. Create user_research_interests table
3. Create user_publications table
4. Create user_activity_logs table
5. Create user_bookmarks table
6. Create user_follows table

### Phase 3: Thesis Features
1. Create thesis_reports table
2. Create research_methodologies & thesis_methodologies
3. Create thesis_awards table
4. Create thesis_citations table
5. Create thesis_similarities table

### Phase 4: Search & Discovery
1. Create saved_searches table
2. Create search_history table
3. Add full-text search indexes

### Phase 5: Collections & Social
1. Create thesis_collections & collection_theses
2. Create thesis_comments & comment_reactions
3. Create notifications table
4. Create system_announcements table

### Phase 6: Analytics & Rankings
1. Create trending_topics table
2. Create institution_rankings table
3. Create researcher_rankings table
4. Create thesis_exports table

### Phase 7: Bulk Upload & AI
1. Create bulk_upload_batches & bulk_upload_files
2. Create ml_models table
3. Create thesis_auto_categories table
4. Create thesis_summaries table

---

## 🎯 PRIORITY RECOMMENDATIONS

### CRITICAL (Do Immediately):
1. ✅ Fix thesis_academic_persons UNIQUE constraints
2. ✅ Add indexes on all foreign keys
3. ✅ Add CASCADE delete rules
4. ✅ Fix VARCHAR size limitations

### HIGH PRIORITY:
5. ✅ Add user profile fields
6. ✅ Create user_activity_logs
7. ✅ Create thesis_reports
8. ✅ Create notifications system
9. ✅ Create saved_searches

### MEDIUM PRIORITY:
10. ✅ Create collections system
11. ✅ Create comments & engagement
12. ✅ Create citations tracking
13. ✅ Create bookmarks & follows
14. ✅ Add research methodologies

### LOW PRIORITY (Future):
15. ✅ Rankings & analytics
16. ✅ AI/ML tables
17. ✅ Trending topics
18. ✅ Advanced recommendations

---

## 📈 ESTIMATED TABLE COUNT

**Current:** 17 tables
**Proposed:** 55+ tables

This comprehensive structure will support all your requirements while maintaining data integrity and performance.

