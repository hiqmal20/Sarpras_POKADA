const supabase = require('../config/supabaseClient');
const AppError = require('../utils/appError');

exports.findAllPackages = async ({ status, search }) => {
  let query = supabase
    .from('packages')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: packages, error } = await query;
  if (error) throw error;

  const packageIds = packages.map(p => p.id);
  let itemsMap = {};

  if (packageIds.length > 0) {
    const { data: pkgItems, error: itemsError } = await supabase
      .from('packages_items')
      .select(`
        id,
        quantity,
        package_id,
        item_id,
        items (id, name, code, image_url, available_stock, condition)
      `)
      .in('package_id', packageIds);

    if (!itemsError && pkgItems) {
      pkgItems.forEach(item => {
        if (!itemsMap[item.package_id]) itemsMap[item.package_id] = [];
        itemsMap[item.package_id].push(item);
      });
    }
  }

  return packages.map(pkg => ({
    ...pkg,
    packages_items: itemsMap[pkg.id] || []
  }));
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
      id,
      quantity,
      package_id,
      item_id,
      items (id, name, code, image_url, available_stock, condition)
    `)
    .eq('package_id', id);

  return {
    ...pkg,
    packages_items: pkgItems || []
  };
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
    const itemsData = items.map(item => ({
      package_id: newPkg.id,
      item_id: item.item_id,
      quantity: item.quantity || 1
    }));

    const { error: insertItemsError } = await supabase
      .from('packages_items')
      .insert(itemsData);

    if (insertItemsError) throw insertItemsError;
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
    await supabase.from('packages_items').delete().eq('package_id', id);

    if (items.length > 0) {
      const itemsData = items.map(item => ({
        package_id: id,
        item_id: item.item_id,
        quantity: item.quantity || 1
      }));

      const { error: insertError } = await supabase
        .from('packages_items')
        .insert(itemsData);

      if (insertError) throw insertError;
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
