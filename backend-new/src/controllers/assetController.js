const { Op } = require('sequelize');
const { Asset, AssetAllocation, Employee } = require('../models');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;

    const { count, rows } = await Asset.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = rows.map(r => {
      const json = r.toJSON();
      return {
        ...json,
        asset_tag: json.serial_number || null,
        category_name: json.category || '—',
        purchase_date: json.purchase_date || null,
        purchase_cost: json.purchase_cost ? parseFloat(json.purchase_cost) : null,
      };
    });

    return res.json({
      results,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    console.error('Assets list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const data = { ...req.body };
    // Map frontend fields
    if (data.asset_tag && !data.serial_number) { data.serial_number = data.asset_tag; delete data.asset_tag; }
    if (data.category_id && !data.category) { data.category = data.category_id; delete data.category_id; }
    const asset = await Asset.create(data);
    return res.status(201).json(asset);
  } catch (err) {
    console.error('Create asset error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.allocate = async (req, res) => {
  try {
    const { asset_id, employee_id, allocation_date, allocated_date, notes } = req.body;

    const asset = await Asset.findByPk(asset_id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (asset.status === 'allocated') {
      return res.status(400).json({ error: 'Asset is already allocated.' });
    }

    const allocation = await AssetAllocation.create({
      asset_id,
      employee_id,
      allocated_date: allocation_date || allocated_date || new Date().toISOString().split('T')[0],
      notes,
    });

    await asset.update({ status: 'allocated' });

    return res.status(201).json(allocation);
  } catch (err) {
    console.error('Allocate asset error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.returnAsset = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const allocation = await AssetAllocation.findOne({
      where: { asset_id: asset.id, return_date: null },
    });

    if (allocation) {
      const returnDate = req.body.return_date || new Date().toISOString().split('T')[0];
      await allocation.update({ return_date: returnDate });
    }

    await asset.update({ status: 'available' });

    return res.json({ message: 'Asset returned.' });
  } catch (err) {
    console.error('Return asset error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getAllocations = async (req, res) => {
  try {
    // RBAC: employee sees only own allocations
    const allocWhere = {};
    if (req.user.role === 'employee') {
      allocWhere.employee_id = req.user.employee_id;
    }

    const allocations = await AssetAllocation.findAll({
      where: allocWhere,
      include: [
        { model: Asset, as: 'asset', attributes: ['id', 'name', 'category', 'serial_number', 'status'] },
        { model: Employee, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'badge_id'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Flatten for frontend
    const results = allocations.map(r => {
      const json = r.toJSON();
      const asset = json.asset;
      const emp = json.employee;
      return {
        ...json,
        asset_name: asset ? asset.name : '—',
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '—',
        allocation_date: json.allocated_date,
        return_date: json.return_date || null,
      };
    });

    return res.json(results);
  } catch (err) {
    console.error('Asset allocations error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    await asset.destroy();
    return res.json({ message: 'Asset deleted.' });
  } catch (err) {
    console.error('Delete asset error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Asset.findAll({
      attributes: [[Asset.sequelize.fn('DISTINCT', Asset.sequelize.col('category')), 'name']],
      where: { category: { [Op.ne]: null } },
      raw: true,
    });

    return res.json(categories.map(c => ({ id: c.name, name: c.name })));
  } catch (err) {
    console.error('Asset categories error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    return res.status(201).json({ id: name, name, description: description || '' });
  } catch (err) {
    console.error('Create asset category error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
