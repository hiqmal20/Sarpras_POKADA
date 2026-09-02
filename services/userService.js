const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllUsers = async ({ role, status, search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,nomor_induk.ilike.%${search}%,no_hp.ilike.%${search}%`);
  }

  query = query.range(offset, offset + Number(limit) - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    users: data,
    total: count,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(count / limit)
  };
};

exports.findUserById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError('Pengguna tidak ditemukan', 404);
  }

  return data;
};

exports.createUserProfile = async ({ nomor_induk, name, email, password, role = 'Mahasiswa', no_hp = '', foto = null, status = 'Aktif' }) => {
  const cleanNomorInduk = (nomor_induk || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();

  // 1. Cek duplikasi email
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('id')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (existingByEmail) {
    throw new AppError('Email sudah terdaftar', 400);
  }

  // Cek duplikasi nomor_induk (hanya jika diisi)
  if (cleanNomorInduk) {
    const { data: existingByNomorInduk } = await supabase
      .from('users')
      .select('id')
      .ilike('nomor_induk', cleanNomorInduk)
      .maybeSingle();

    if (existingByNomorInduk) {
      throw new AppError('Nomor Induk sudah terdaftar', 400);
    }
  }

  let userId = null;

  // 2. Buat akun di Supabase Auth Admin
  const userPassword = password || 'Pokada@123';
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: cleanEmail,
    password: userPassword,
    email_confirm: true,
    user_metadata: {
      name: cleanName,
      role,
      nomor_induk: cleanNomorInduk,
      no_hp
    }
  });

  if (authError) {
    if (authError.message.includes('not authorized') || authError.status === 403) {
      const { data: fallbackAuth, error: fallbackErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: userPassword,
        options: {
          data: { name: cleanName, role, nomor_induk: cleanNomorInduk, no_hp }
        }
      });
      if (fallbackErr) throw new AppError(fallbackErr.message, 400);
      userId = fallbackAuth.user?.id;
    } else {
      throw new AppError(authError.message, 400);
    }
  } else {
    userId = authUser.user?.id;
  }

  const payload = {
    id: userId,
    nomor_induk: cleanNomorInduk,
    name: cleanName,
    email: cleanEmail,
    role,
    no_hp,
    foto,
    status: status || 'Aktif',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
};

exports.updateUserProfile = async (id, { nomor_induk, name, role, no_hp, foto, status }) => {
  const updatePayload = {
    update_at: new Date().toISOString()
  };

  if (nomor_induk !== undefined) updatePayload.nomor_induk = nomor_induk.trim();
  if (name !== undefined) updatePayload.name = name;
  if (role !== undefined) updatePayload.role = role;
  if (no_hp !== undefined) updatePayload.no_hp = no_hp;
  if (foto !== undefined) updatePayload.foto = foto;
  if (status !== undefined) updatePayload.status = status;

  const { data, error } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    throw new AppError('Gagal memperbarui profil pengguna', 404);
  }

  return data;
};

exports.deleteUser = async (id) => {
  // Coba hapus juga dari auth users jika memungkinkan
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch (_) {
    // Abaikan jika tidak punya izin admin service role
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};


exports.uploadProfilePhoto = async (userId, fileBuffer, mimetype) => {
  const supabase = require('../config/supabaseClient');
  
  // Generate unique filename
  const fileExt = mimetype.split('/')[1]; // jpeg, png, etc
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `profile-photos/${fileName}`;

  // Upload ke Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('sarpras-assets') // nama bucket di Supabase Storage
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      upsert: true // replace jika sudah ada
    });

  if (uploadError) {
    throw new AppError('Gagal mengunggah foto: ' + uploadError.message, 500);
  }

  // Dapatkan public URL
  const { data: urlData } = supabase.storage
    .from('sarpras-assets')
    .getPublicUrl(filePath);

  const photoUrl = urlData.publicUrl;

  // Update kolom foto di tabel users
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ foto: photoUrl })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    throw new AppError('Gagal memperbarui foto profil', 500);
  }

  return updatedUser;
};

exports.importUsersFromCSV = async (csvBuffer) => {
  const { parse } = require('csv-parse/sync');

  // Parse CSV dari buffer
  let records;
  try {
    records = parse(csvBuffer, {
      columns: true,          // baris pertama jadi nama kolom
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    throw new AppError('Format file CSV tidak valid: ' + err.message, 400);
  }

  if (!records || records.length === 0) {
    throw new AppError('File CSV kosong atau tidak memiliki data', 400);
  }

  // Validasi kolom wajib ada
  const requiredColumns = ['name', 'email', 'nomor_induk'];
  const headers = Object.keys(records[0]);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    throw new AppError(`Kolom wajib tidak ditemukan di CSV: ${missingColumns.join(', ')}`, 400);
  }

  const results = {
    success: [],
    failed: []
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +2 karena baris 1 adalah header

    try {
      // Validasi field wajib per baris
      if (!row.name || !row.email || !row.nomor_induk) {
        throw new Error('name, email, dan nomor_induk wajib diisi');
      }

      const userData = {
        name: row.name,
        email: row.email,
        nomor_induk: row.nomor_induk,
        role: row.role || 'Mahasiswa',
        no_hp: row.no_hp || '',
        password: row.password || 'Pokada@123',
        status: row.status || 'Aktif'
      };

      const created = await exports.createUserProfile(userData);
      results.success.push({ row: rowNum, email: row.email, id: created.id });
    } catch (err) {
      results.failed.push({ row: rowNum, email: row.email || '-', reason: err.message });
    }
  }

  return results;
};
