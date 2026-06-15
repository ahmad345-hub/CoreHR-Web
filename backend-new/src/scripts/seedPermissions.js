/**
 * Seed default permissions for all existing users who don't have a UserPermission record.
 * Run: node src/scripts/seedPermissions.js
 */
require('dotenv').config();
const { User, UserPermission, sequelize } = require('../models');
const { getDefaultPermissions } = require('../controllers/permissionController');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Ensure table exists
    await UserPermission.sync({ alter: true });

    const users = await User.findAll({ attributes: ['id', 'role'] });
    let created = 0;

    for (const user of users) {
      const existing = await UserPermission.findOne({ where: { user_id: user.id } });
      if (!existing) {
        const defaults = getDefaultPermissions(user.role);
        await UserPermission.create({ user_id: user.id, permissions: defaults });
        created++;
        console.log(`Created permissions for user ${user.id} (${user.role})`);
      }
    }

    console.log(`Done. Created ${created} permission records for ${users.length} total users.`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
