-- ============================================================
-- MIGRATION: Fitur Reply Pesan Chat (Sarpras POKADA)
-- Jalankan ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tambah kolom reply_to_message_id ke tabel chat_messages
-- Referensikan ke tabel chat_messages(id) dengan ON DELETE SET NULL
-- agar apabila pesan asli yang dibalas dihapus, pesan balasan
-- TIDAK terhapus, melainkan nilai reply_to_message_id menjadi NULL.
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS a UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- 2. Buat index pada reply_to_message_id untuk mempercepat pencarian relasi reply
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_message_id
ON chat_messages(reply_to_message_id);

-- 3. (Opsional) Verifikasi kolom pada tabel chat_messages
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'chat_messages'
-- ORDER BY ordinal_position;
