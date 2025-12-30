const { Client } = require('pg');
const bcrypt = require('bcryptjs');
(async () => {
  const db = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'plutoniumdb', database: 'ntsamaela' });
  await db.connect();
  const users = [
    { phone: '71234567', firstName: 'Test', lastName: 'Customer', userType: 'CUSTOMER' },
    { phone: '72345678', firstName: 'Test', lastName: 'Driver', userType: 'DRIVER' }
  ];
  const passwordHash = await bcrypt.hash('password123', 12);
  for (const u of users) {
    const exists = await db.query('SELECT id FROM  User WHERE phone=', [u.phone]);
    if (exists.rows.length === 0) {
      const id = user_;
      await db.query('INSERT INTO User (id, firstName, lastName, phone, email, passwordHash, userType, identityVerified, emailVerified, createdAt, updatedAt) VALUES (,,,,,,,,,NOW(),NOW())', [id, u.firstName, u.lastName, u.phone, ${u.phone}@example.com, passwordHash, u.userType, true, true]);
      await db.query('INSERT INTO Wallet (id, userId, balance, currency, createdAt, updatedAt) VALUES (,,0,\'BWP\',NOW(),NOW())', [wallet_, id]);
      if (u.userType === 'DRIVER') {
        await db.query('INSERT INTO Driver (id, userId, rating, totalDeliveries, active) VALUES (,,0,0,true)', [driver_, id]);
      }
      console.log('Seeded', u.userType, u.phone);
    } else {
      console.log('Exists', u.userType, u.phone);
    }
  }
  await db.end();
})().catch(e => { console.error(e); process.exit(1); });
