-- Supabase Fonksiyon Güvenlik Ayarları (Fix Functions)
-- Bu scripti SQL Editor'de çalıştırın.
-- "Function Search Path Mutable" uyarısını düzeltir.

-- Fonksiyonların arama yolunu 'public' olarak sabitle
-- Eğer fonksiyon parametreleri farklıysa hata verebilir. 
-- Hata alırsanız o satırı silip diğerlerini çalıştırın.

-- 1. clean_bulletin_noise
ALTER FUNCTION public.clean_bulletin_noise() SET search_path = public;

-- 2. trg_clean_bulletin_marks_noise
ALTER FUNCTION public.trg_clean_bulletin_marks_noise() SET search_path = public;

-- 3. clean_mark_text_540_remove_kurumu_suffix
ALTER FUNCTION public.clean_mark_text_540_remove_kurumu_suffix() SET search_path = public;

-- 4. clean_bulletin_marka_kurumu_pattern
ALTER FUNCTION public.clean_bulletin_marka_kurumu_pattern() SET search_path = public;

-- 5. clean_mark_text_540 (Genelde text parametresi alır)
-- Eğer hata verirse aşağıdaki satırı silmeyi deneyin veya parametresiz deneyin.
ALTER FUNCTION public.clean_mark_text_540(text) SET search_path = public;

-- 6. clean_bulletin_marks_all_textcols
ALTER FUNCTION public.clean_bulletin_marks_all_textcols() SET search_path = public;
