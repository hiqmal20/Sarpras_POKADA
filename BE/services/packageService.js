const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

/**
 * Cek apakah semua item dalam package tersedia.
 * Package dianggap tersedia HANYA jika semua item di dalamnya
 * memiliki available_stock >= quantity yang dibutuhkan.
 */
const checkPackageAvailability = (pkgItems, activeDamagesMap = {}) => {
  if (!pkgItems || pkgItems.length === 0) return { isAvailable: false, unavailableItems: [], stock: 0, available_stock: 0 };

  let maxStock = Infinity;
  let availableStock = Infinity;

  const unavailableItems = pkgItems.filter(pi => {
    const item = pi.items;
    if (!item) return true;
    const avail = Number(item.available_stock !== undefined && item.available_stock !== null ? item.available_stock : item.stock || 0);
    const total = Number(item.stock || 0);
    const needed = Number(pi.quantity || 1);

    const possibleFromTotal = Math.floor(total / needed);
    const possibleFromAvail = (item.status === 'Dalam Pemeliharaan' && avail <= 0) ? 0 : Math.floor(avail / needed);

    if (possibleFromTotal < maxStock) maxStock = possibleFromTotal;
    if (possibleFromAvail < availableStock) availableStock = possibleFromAvail;

    return avail < needed || (item.status === 'Dalam Pemeliharaan' && avail <= 0);
  });

  if (maxStock === Infinity || pkgItems.length === 0) maxStock = 0;
  if (availableStock === Infinity || pkgItems.length === 0) availableStock = 0;

  return {
    isAvailable: unavailableItems.length === 0 && availableStock > 0,
    stock: maxStock,
    available_stock: availableStock,
    unavailableItems: unavailableItems.map(pi => {
      const activeDmg = activeDamagesMap[pi.item_id];
      const damageReason = activeDmg ? `sebagian unit sedang dalam perbaikan: "${activeDmg.title}"` : null;
      return {
        item_id: pi.item_id,
        name: pi.items?.name || 'Unknown',
        needed: pi.quantity,
        available: pi.items?.available_stock || 0,
        status: pi.items?.status || 'Tidak diketahui',
        damage_reason: damageReason
      };
    })
  };
};

exports.findAllPackages = async ({ status, search }) => {
  let query = supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) {
    const safeSearch = String(search).replace(/[(),.%]/g, ' ').trim().slice(0, 80);
    if (safeSearch) query = query.ilike('name', `%${safeSearch}%`);
  }

  const { data: packages, error } = await query;
  if (error) throw error;

  const packageIds = packages.map(p => p.id);
  let itemsMap = {};

  // Ambil laporan kerusakan aktif
  const { data: activeDamages } = await supabase
    .from('damage_reports')
    .select('id, item_id, package_id, title, status, description')
    .neq('status', 'Selesai');

  const damagesByItemId = {};
  const damagesByPkgId = {};
  (activeDamages || []).forEach(d => {
    if (d.item_id) damagesByItemId[d.item_id] = d;
    if (d.package_id) damagesByPkgId[d.package_id] = d;
  });

  if (packageIds.length > 0) {
    const { data: pkgItems, error: itemsError } = await supabase
      .from('packages_items')
      .select(`
        id, quantity, package_id, item_id,
        items (id, name, code, image_url, available_stock, stock, condition, status, category_id, categories (id, name))
      `)
      .in('package_id', packageIds);

    if (!itemsError && pkgItems) {
      pkgItems.forEach(item => {
        if (item.items) {
          item.items.category = item.items.categories?.name || 'Umum';
        }
        if (!itemsMap[item.package_id]) itemsMap[item.package_id] = [];
        itemsMap[item.package_id].push(item);
      });
    }
  }

  return packages.map(pkg => {
    const pkgItems = itemsMap[pkg.id] || [];
    const activeDmgPkg = damagesByPkgId[pkg.id];
    const availability = checkPackageAvailability(pkgItems, damagesByItemId);
    const isUnderRepair = pkg.status === 'Dalam Pemeliharaan' || Boolean(activeDmgPkg) || availability.unavailableItems.some(ui => ui.damage_reason);
    const isManuallyInactive = ['Nonaktif', 'Non-Aktif', 'Tidak Aktif'].includes(pkg.status);
    const isAvailable = availability.isAvailable && !isManuallyInactive && !isUnderRepair;
    const effectiveStatus = isUnderRepair ? 'Dalam Pemeliharaan' : (isManuallyInactive ? 'Non-Aktif' : (!availability.isAvailable ? 'Non-Aktif' : 'Aktif'));

    const damagedComponent = availability.unavailableItems.find(ui => ui.damage_reason);
    const damageReason = activeDmgPkg
      ? `Paket sedang dalam perbaikan (${activeDmgPkg.title})`
      : (damagedComponent ? `Komponen "${damagedComponent.name}" ${damagedComponent.damage_reason}` : null);

    const categoriesList = Array.from(
      new Set(
        pkgItems
          .map(pi => pi.items?.categories?.name || pi.items?.category)
          .filter(Boolean)
      )
    );

    return {
      ...pkg,
      status: pkg.status || 'Aktif',
      effective_status: effectiveStatus,
      is_available: isAvailable,
      stock: availability.stock,
      available_stock: isUnderRepair || isManuallyInactive ? 0 : availability.available_stock,
      damage_reason: damageReason,
      has_empty_item: !availability.isAvailable,
      unavailable_items: availability.isAvailable ? [] : availability.unavailableItems,
      categories: categoriesList,
      category: categoriesList.length > 0 ? categoriesList.join(', ') : 'Umum',
      packages_items: pkgItems
    };
  });
};

exports.findPackageById = async (id) => {
  const { data: pkg, error } = await supabase
    .from('packages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !pkg) {
    throw new AppError('Paket Sarpras tidak ditemukan', 404);
  }

  const { data: pkgItems } = await supabase
    .from('packages_items')
    .select(`
      id, quantity, package_id, item_id,
      items (id, name, code, image_url, available_stock, stock, condition, status, category_id, categories (id, name))
    `)
    .eq('package_id', id);

  if (pkgItems) {
    pkgItems.forEach(item => {
      if (item.items) {
        item.items.category = item.items.categories?.name || 'Umum';
      }
    });
  }

  // Ambil laporan kerusakan aktif
  const { data: activeDamages } = await supabase
    .from('damage_reports')
    .select('id, item_id, package_id, title, status, description')
    .neq('status', 'Selesai');

  const damagesByItemId = {};
  let activeDmgPkg = null;
  (activeDamages || []).forEach(d => {
    if (d.item_id) damagesByItemId[d.item_id] = d;
    if (d.package_id === id) activeDmgPkg = d;
  });

  const availability = checkPackageAvailability(pkgItems || [], damagesByItemId);
  const isUnderRepair = pkg.status === 'Dalam Pemeliharaan' || Boolean(activeDmgPkg) || availability.unavailableItems.some(ui => ui.damage_reason);
  const isManuallyInactive = ['Nonaktif', 'Non-Aktif', 'Tidak Aktif'].includes(pkg.status);
  const isAvailable = availability.isAvailable && !isManuallyInactive && !isUnderRepair;
  const effectiveStatus = isUnderRepair ? 'Dalam Pemeliharaan' : (isManuallyInactive ? 'Non-Aktif' : (!availability.isAvailable ? 'Non-Aktif' : 'Aktif'));

  const damagedComponent = availability.unavailableItems.find(ui => ui.damage_reason);
  const damageReason = activeDmgPkg
    ? `Paket sedang dalam perbaikan (${activeDmgPkg.title})`
    : (damagedComponent ? `Komponen "${damagedComponent.name}" ${damagedComponent.damage_reason}` : null);

  const categoriesList = Array.from(
    new Set(
      (pkgItems || [])
        .map(pi => pi.items?.categories?.name || pi.items?.category)
        .filter(Boolean)
    )
  );

  return {
    ...pkg,
    status: pkg.status || 'Aktif',
    effective_status: effectiveStatus,
    is_available: isAvailable,
    stock: availability.stock,
    available_stock: isUnderRepair || isManuallyInactive ? 0 : availability.available_stock,
    damage_reason: damageReason,
    has_empty_item: !availability.isAvailable,
    unavailable_items: availability.isAvailable ? [] : availability.unavailableItems,
    categories: categoriesList,
    category: categoriesList.length > 0 ? categoriesList.join(', ') : 'Umum',
    // Jika package tidak tersedia, sertakan info item yang bisa dipinjam satuan
    individual_borrow_suggestion: availability.isAvailable ? null : {
      message: 'Package tidak lengkap. Anda tetap bisa meminjam item yang tersedia secara satuan.',
      available_items: (pkgItems || [])
        .filter(pi => pi.items?.available_stock >= pi.quantity && pi.items?.status === 'Tersedia' && !damagesByItemId[pi.item_id])
        .map(pi => ({
          item_id: pi.item_id,
          name: pi.items?.name,
          available_stock: pi.items?.available_stock
        }))
    },
    packages_items: pkgItems || []
  };
};

const resolvePackageItems = async (items, defaultDescription = '') => {
  if (!items || !Array.isArray(items)) return [];
  const resolved = [];

  for (const item of items) {
    let itemId = item.item_id;
    const qty = Math.max(1, parseInt(item.quantity || 1, 10));

    // Jika item_id belum ada tapi kode/nama diinput khusus paket
    if (!itemId && item.code) {
      const codeUpper = item.code.trim().toUpperCase();
      const { data: existingItem } = await supabase
        .from('items')
        .select('id')
        .eq('code', codeUpper)
        .maybeSingle();

      if (existingItem) {
        itemId = existingItem.id;
      } else {
        const { data: createdItem, error: createError } = await supabase
          .from('items')
          .insert([{
            name: item.name || `Barang Paket (${codeUpper})`,
            code: codeUpper,
            stock: qty * 10,
            available_stock: qty * 10,
            condition: 'Baik',
            status: 'Tersedia',
            description: defaultDescription ? `Komponen barang khusus paket (${defaultDescription})` : 'Barang khusus paket sarpras'
          }])
          .select('id')
          .single();

        if (!createError && createdItem) {
          itemId = createdItem.id;
        }
      }
    }

    if (itemId) {
      resolved.push({
        item_id: itemId,
        quantity: qty
      });
    }
  }

  return resolved;
};

exports.createNewPackage = async ({ name, description = '', image_url = null, status = 'Aktif', items = [] }) => {
  const { data: newPkg, error: pkgError } = await supabase
    .from('packages')
    .insert([{
      name,
      description,
      image_url,
      status,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (pkgError) throw pkgError;

  if (items && items.length > 0) {
    const resolvedItems = await resolvePackageItems(items, name);
    if (resolvedItems.length > 0) {
      const itemsData = resolvedItems.map(item => ({
        package_id: newPkg.id,
        item_id: item.item_id,
        quantity: item.quantity || 1
      }));

      const { error: insertItemsError } = await supabase
        .from('packages_items')
        .insert(itemsData);

      if (insertItemsError) {
        try {
          await supabase.from('packages_items').delete().eq('package_id', newPkg.id);
          await supabase.from('packages').delete().eq('id', newPkg.id);
        } catch (_) { /* best effort rollback */ }
        throw insertItemsError;
      }
    }
  }

  return exports.findPackageById(newPkg.id);
};

exports.updateExistingPackage = async (id, { name, description, image_url, status, items }) => {
  const updatePayload = {};
  if (name !== undefined) updatePayload.name = name;
  if (description !== undefined) updatePayload.description = description;
  if (image_url !== undefined) updatePayload.image_url = image_url;
  if (status !== undefined) updatePayload.status = status;

  if (Object.keys(updatePayload).length > 0) {
    const { error: updateError } = await supabase
      .from('packages')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) throw updateError;
  }

  if (items && Array.isArray(items)) {
    const { data: previousItems, error: readPrevError } = await supabase
      .from('packages_items')
      .select('item_id, quantity')
      .eq('package_id', id);

    if (readPrevError) throw readPrevError;

    const { error: deleteError } = await supabase.from('packages_items').delete().eq('package_id', id);
    if (deleteError) throw deleteError;

    if (items.length > 0) {
      const resolvedItems = await resolvePackageItems(items, name || '');
      if (resolvedItems.length > 0) {
        const itemsData = resolvedItems.map(item => ({
          package_id: id,
          item_id: item.item_id,
          quantity: item.quantity || 1
        }));

        const { error: insertError } = await supabase
          .from('packages_items')
          .insert(itemsData);

        if (insertError) {
          try {
            const restorePayload = (previousItems || []).map(item => ({
              package_id: id,
              item_id: item.item_id,
              quantity: item.quantity || 1
            }));
            if (restorePayload.length > 0) {
              await supabase.from('packages_items').insert(restorePayload);
            }
          } catch (_) { /* best effort rollback */ }
          throw insertError;
        }
      }
    }
  }

  return exports.findPackageById(id);
};

exports.deleteExistingPackage = async (id) => {
  await supabase.from('packages_items').delete().eq('package_id', id);

  const { error } = await supabase
    .from('packages')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

exports.importPackagesFromCSV = async (csvBuffer) => {
  const { parse } = require('csv-parse/sync');

  let records;
  try {
    records = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    throw new AppError('Format file CSV tidak valid: ' + err.message, 400);
  }

  if (!records || records.length === 0) {
    throw new AppError('File CSV kosong atau tidak memiliki data', 400);
  }

  const { data: dbItems, error: itemsError } = await supabase
    .from('items')
    .select('id, code, name');
  if (itemsError) throw itemsError;

  const itemMapByCode = {};
  (dbItems || []).forEach(item => {
    if (item.code) itemMapByCode[item.code.trim().toUpperCase()] = item.id;
  });

  const packagesMap = {};
  for (const row of records) {
    const pkgName = (row.name || row.package_name || '').trim();
    if (!pkgName) continue;

    if (!packagesMap[pkgName]) {
      packagesMap[pkgName] = {
        name: pkgName,
        description: (row.description || '').trim(),
        status: (row.status || 'Aktif').trim(),
        items: []
      };
    }

    const itemCode = (row.item_code || row.kode_barang || '').trim().toUpperCase();
    const qty = Math.max(1, parseInt(row.quantity || row.qty || '1', 10));

    if (itemCode && itemMapByCode[itemCode]) {
      packagesMap[pkgName].items.push({
        item_id: itemMapByCode[itemCode],
        quantity: qty
      });
    } else if (row.item_codes) {
      const pairs = row.item_codes.split(/[;,]/);
      pairs.forEach(pair => {
        const [code, q] = pair.split(':').map(s => s.trim());
        const cUpper = (code || '').toUpperCase();
        if (cUpper && itemMapByCode[cUpper]) {
          packagesMap[pkgName].items.push({
            item_id: itemMapByCode[cUpper],
            quantity: Math.max(1, parseInt(q || '1', 10))
          });
        }
      });
    }
  }

  const results = {
    success: [],
    failed: []
  };

  for (const [pkgName, pkgData] of Object.entries(packagesMap)) {
    try {
      const created = await exports.createNewPackage(pkgData);
      results.success.push({
        name: pkgName,
        itemsCount: pkgData.items.length,
        id: created.id
      });
    } catch (err) {
      results.failed.push({
        name: pkgName,
        reason: err.message
      });
    }
  }

  return results;
};

/**
 * Menambah atau mengurangi stok paket secara proporsional.
 * Mengubah stock dan available_stock pada seluruh item komponen di dalam paket.
 */
exports.adjustPackageStock = async (packageId, { action = 'add', quantity = 1 }) => {
  const numQty = Number(quantity);
  if (!numQty || numQty <= 0) {
    throw new AppError('Jumlah perubahan stok paket harus lebih dari 0', 400);
  }

  const { data: pkgItems, error: itemsError } = await supabase
    .from('packages_items')
    .select('item_id, quantity')
    .eq('package_id', packageId);

  if (itemsError || !pkgItems || pkgItems.length === 0) {
    throw new AppError('Paket tidak ditemukan atau belum memiliki komponen barang', 404);
  }

  const now = new Date().toISOString();

  // Validasi jika pengurangan: pastikan stok barang mencukupi
  if (action === 'reduce') {
    for (const pi of pkgItems) {
      const { data: item } = await supabase
        .from('items')
        .select('name, available_stock, stock')
        .eq('id', pi.item_id)
        .single();

      const deductAmount = (Number(pi.quantity) || 1) * numQty;
      const currentAvail = Number(item?.available_stock !== undefined && item?.available_stock !== null ? item.available_stock : item?.stock || 0);
      if (currentAvail < deductAmount) {
        throw new AppError(`Stok barang "${item?.name || 'Komponen'}" tidak mencukupi untuk dikurangi sebanyak ${deductAmount} unit (tersedia: ${currentAvail})`, 400);
      }
    }
  }

  // Update stok masing-masing barang komponen secara proporsional
  for (const pi of pkgItems) {
    const { data: item } = await supabase
      .from('items')
      .select('stock, available_stock, status')
      .eq('id', pi.item_id)
      .single();

    if (item) {
      const delta = (Number(pi.quantity) || 1) * numQty;
      const curStock = Number(item.stock || 0);
      const curAvail = Number(item.available_stock !== undefined && item.available_stock !== null ? item.available_stock : curStock);

      let newStock, newAvail;
      if (action === 'add') {
        newStock = curStock + delta;
        newAvail = curAvail + delta;
      } else {
        newStock = Math.max(0, curStock - delta);
        newAvail = Math.max(0, curAvail - delta);
      }

      const newStatus = newAvail > 0 ? 'Tersedia' : 'Stok Kosong';

      await supabase
        .from('items')
        .update({
          stock: newStock,
          available_stock: newAvail,
          status: newStatus,
          update_at: now
        })
        .eq('id', pi.item_id);
    }
  }

  return exports.findPackageById(packageId);
};
