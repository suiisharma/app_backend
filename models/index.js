const logger=require('../logger/logging.config.js');

const createTable = async (db) => {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS code_submissions (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      languages VARCHAR(255) NOT NULL,
      stdin TEXT,
      source_code TEXT,
      output TEXT,
      stderr TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await db.none(createTableSql);
    logger.info('Table created successfully!');
  } catch (error) {
    logger.error('Error creating table:', error);
  }
};

module.exports = createTable;