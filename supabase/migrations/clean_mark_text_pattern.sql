-- ============================================
-- SUPABASE MARKA VERİLERİ TEMİZLİĞİ (SADECE TEXT KOLONLAR)
-- Tablo: bulletin_marks
-- Pattern: "Kurumu" + sonrasındaki tüm metin (tarih, sayılar, vb.)
-- ============================================

-- ADIM 1: Mevcut Verileri Temizle
-- SADECE TEXT KOLONLARDA "Kurumu..." pattern'ini temizle

-- 1.1: mark_text_540 (Marka Adı - TEXT)
UPDATE bulletin_marks
SET mark_text_540 = TRIM(REGEXP_REPLACE(mark_text_540, '\s+Kurumu.*$', '', 'i'))
WHERE mark_text_540 IS NOT NULL AND mark_text_540 ~* '\s+Kurumu';

-- 1.2: application_date_220 (Başvuru Tarihi - TEXT olabilir)
UPDATE bulletin_marks
SET application_date_220 = TRIM(REGEXP_REPLACE(application_date_220::text, '\s+Kurumu.*$', '', 'i'))
WHERE application_date_220 IS NOT NULL AND application_date_220::text ~* '\s+Kurumu';

-- 1.3: owner_agent_731 (Sahip/Vekil - TEXT)
UPDATE bulletin_marks
SET owner_agent_731 = TRIM(REGEXP_REPLACE(owner_agent_731, '\s+Kurumu.*$', '', 'i'))
WHERE owner_agent_731 IS NOT NULL AND owner_agent_731 ~* '\s+Kurumu';

-- 1.4: nice_classes_511 (Nice Sınıfları - TEXT)
UPDATE bulletin_marks
SET nice_classes_511 = TRIM(REGEXP_REPLACE(nice_classes_511, '\s+Kurumu.*$', '', 'i'))
WHERE nice_classes_511 IS NOT NULL AND nice_classes_511 ~* '\s+Kurumu';

-- 1.5: goods_services_510 (Ürün/Hizmet Listesi - TEXT)
UPDATE bulletin_marks
SET goods_services_510 = TRIM(REGEXP_REPLACE(goods_services_510, '\s+Kurumu.*$', '', 'i'))
WHERE goods_services_510 IS NOT NULL AND goods_services_510 ~* '\s+Kurumu';

-- 1.6: excluded_goods_services (Hariç Tutulan - TEXT)
UPDATE bulletin_marks
SET excluded_goods_services = TRIM(REGEXP_REPLACE(excluded_goods_services, '\s+Kurumu.*$', '', 'i'))
WHERE excluded_goods_services IS NOT NULL AND excluded_goods_services ~* '\s+Kurumu';

-- 1.7: viyana_sinifi (Viyana Sınıfı - TEXT)
UPDATE bulletin_marks
SET viyana_sinifi = TRIM(REGEXP_REPLACE(viyana_sinifi, '\s+Kurumu.*$', '', 'i'))
WHERE viyana_sinifi IS NOT NULL AND viyana_sinifi ~* '\s+Kurumu';

-- 1.8: application_no_210 (Başvuru No - TEXT olabilir)
UPDATE bulletin_marks
SET application_no_210 = TRIM(REGEXP_REPLACE(application_no_210::text, '\s+Kurumu.*$', '', 'i'))
WHERE application_no_210 IS NOT NULL AND application_no_210::text ~* '\s+Kurumu';

-- NOT: issue_no INTEGER olduğu için atlıyoruz


-- ============================================
-- ADIM 2: Otomatik Temizlik Trigger'ı
-- ============================================

CREATE OR REPLACE FUNCTION clean_bulletin_marks_kurumu_pattern()
RETURNS TRIGGER AS $$
BEGIN
    -- Sadece TEXT kolonları temizle, NULL kontrolü yap
    
    IF NEW.mark_text_540 IS NOT NULL AND NEW.mark_text_540 ~* '\s+Kurumu' THEN
        NEW.mark_text_540 := TRIM(REGEXP_REPLACE(NEW.mark_text_540, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.application_date_220 IS NOT NULL AND NEW.application_date_220::text ~* '\s+Kurumu' THEN
        NEW.application_date_220 := TRIM(REGEXP_REPLACE(NEW.application_date_220::text, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.owner_agent_731 IS NOT NULL AND NEW.owner_agent_731 ~* '\s+Kurumu' THEN
        NEW.owner_agent_731 := TRIM(REGEXP_REPLACE(NEW.owner_agent_731, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.nice_classes_511 IS NOT NULL AND NEW.nice_classes_511 ~* '\s+Kurumu' THEN
        NEW.nice_classes_511 := TRIM(REGEXP_REPLACE(NEW.nice_classes_511, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.goods_services_510 IS NOT NULL AND NEW.goods_services_510 ~* '\s+Kurumu' THEN
        NEW.goods_services_510 := TRIM(REGEXP_REPLACE(NEW.goods_services_510, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.excluded_goods_services IS NOT NULL AND NEW.excluded_goods_services ~* '\s+Kurumu' THEN
        NEW.excluded_goods_services := TRIM(REGEXP_REPLACE(NEW.excluded_goods_services, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.viyana_sinifi IS NOT NULL AND NEW.viyana_sinifi ~* '\s+Kurumu' THEN
        NEW.viyana_sinifi := TRIM(REGEXP_REPLACE(NEW.viyana_sinifi, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    IF NEW.application_no_210 IS NOT NULL AND NEW.application_no_210::text ~* '\s+Kurumu' THEN
        NEW.application_no_210 := TRIM(REGEXP_REPLACE(NEW.application_no_210::text, '\s+Kurumu.*$', '', 'i'));
    END IF;
    
    -- issue_no INTEGER olduğu için atlıyoruz
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clean_kurumu_pattern ON bulletin_marks;

CREATE TRIGGER trigger_clean_kurumu_pattern
BEFORE INSERT OR UPDATE ON bulletin_marks
FOR EACH ROW
EXECUTE FUNCTION clean_bulletin_marks_kurumu_pattern();


-- ============================================
-- TEST SORGUSU
-- ============================================

SELECT 
    id,
    mark_text_540,
    application_date_220::text AS app_date,
    owner_agent_731
FROM bulletin_marks
WHERE 
    (mark_text_540 IS NOT NULL AND mark_text_540 ~* '\s+Kurumu')
    OR (application_date_220 IS NOT NULL AND application_date_220::text ~* '\s+Kurumu')
    OR (owner_agent_731 IS NOT NULL AND owner_agent_731 ~* '\s+Kurumu')
LIMIT 20;
