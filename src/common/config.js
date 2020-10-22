const nconf = require('nconf');
const fs = require('fs-extra');

if (fs.existsSync(`${__appdir}/config/vault.json`)) {
  process.env['CT_VAULT_CONFIG'] = `${__appdir}/config/vault.json` 
}

nconf
  .argv()
  .env()
  .file('localjson', `${__appdir}/config/local.json`)
  .file('envjson', `${__appdir}/config/${process.env.NODE_ENV || 'development'}.json`)
  .file(`${__appdir}/config/default.json`);

module.exports = nconf