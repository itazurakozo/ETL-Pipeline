//------------------REQUIRES------------------//
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const validator = require('validator');
const winston = require('winston');
const nodemailer = require('nodemailer');


//-------------------SELECT CSV FILE------------------///

// Update string to match file name in csv-raw
const csvFile = '../csv-raw/customers-100000.csv';


//-------------------EXPRESS SETUP-------------------//
const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serving up static files 
app.use(express.static(path.resolve(__dirname, '../client')))


//------------------SETUP WINSTON LOGGER------------------//
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'etl.log' })
  ]
});

//------------------SETUP NODEMAILER------------------//
const transporter = nodemailer.createTransport({
  port: 465,         
  host: 'smtp.gmail.com',
     auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
       },
  secure: true,
  });

// Function to send an error email
function sendErrorEmail(currentProcess){
  return {
    from: process.env.EMAIL_USER, 
      to: process.env.ALERT_EMAIL,  
      subject: 'ETL Process Error Alert',
      text: 'ETL Process Error',
      html: `
      <p>An error occurred during the <strong>${currentProcess}</strong>
      <em>Timestamp: ${new Date().toISOString()}</em></p>
    `,
    };
}

//------------------DATABASE SETUP------------------//
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


//------------------TABLE CREATION------------------//
async function setupDatabase() {
  const connection = await db.getConnection();
  try {
    logger.info('Setting up database...');

    // Create Customers Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Customers (
        customer_id VARCHAR(20) PRIMARY KEY,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        city VARCHAR(100),
        country VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        INDEX idx_country (country)
      );
    `);

    // Create Contacts Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Contacts (
        contact_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(20),
        phone_number VARCHAR(50),
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id)
      );
    `);

    // Create Subscriptions Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Subscriptions (
        subscription_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(20),
        subscription_date DATE,
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id)
      );
    `);
    
    // Create Companies Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Companies (
        company_id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) UNIQUE,
        INDEX idx_company_name (company_name)
      );
    `);

    // Create Customer_Companies Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Customer_Companies (
        customer_id VARCHAR(20),
        company_id INT,
        PRIMARY KEY (customer_id, company_id),
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
        FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_company_id (company_id)
      );
    `);

    // Create Websites Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Websites (
        website_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(20),
        website_url VARCHAR(255),
        FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id)
      );
    `);

    logger.info('Database setup complete.');
  } catch (error) {
    logger.error('Database setup error:', error);
  } finally {
    connection.release();
  }
}


//---------------------- ETL STATUS ----------------------//
let etlStatus = {
  stage: 'Idle',
  message: 'ETL process has not started yet.',
  progress: {
    extract: '0%',
    transform: '0%',
    load: '0%'
  }
};

//------------------EXTRACT FUNCTION------------------//
async function extractData() {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    
    // Initialize ETL status to indicate extraction has started
    etlStatus = {
      stage: 'Extracting',
      message: 'Extracting data.',
      progress: {
        extract: '0%',
        transform: '0%',
        load: '0%'
      }
    };

    logger.info('Starting data extraction.');

    // Define CSV file path
    const csvFilePath = path.join(__dirname, csvFile);

    // Check if the CSV file exists, otherwise throw an error
    if (!fs.existsSync(csvFilePath)) {
      logger.error('CSV file does not exist');
      return reject(new Error('CSV file does not exist'));
    }

    // Declare an array to store extracted data
    const results = [];

    // Stream and parse CSV file - replace empty fields with 'N/A'
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => {
        // Replace empty fields with 'N/A'
        Object.keys(data).forEach((key) => {
          if (!data[key] || data[key].trim() === '') {
            data[key] = 'N/A';
          }
        });
        results.push(data);
      })
      .on('end', () => {
        // Update ETL status after extraction completes
        etlStatus.message = 'Extracted';
        etlStatus.progress.extract = '100%';

        logger.info(`Extraction complete. Processed ${results.length} records in ${Date.now() - startTime}ms.`);
        
        resolve(results);
      })
      .on('error', (error) => {
        logger.error(`Error during extraction: ${error.message}`);
        
        // Send an error email notification
        transporter.sendMail(sendErrorEmail('Extraction'), (error, info) => {
          if (error) {
            logger.error(`Failed to send error email: ${error.message}`);
          } else {
            logger.info(`Error email sent: ${info.response}`);
          }
        });
        
        reject(error);
      });
  });
}

//------------------TRANSFORM FUNCTION------------------//
function transformData(data) {
  const startTime = Date.now();

  try {
    logger.info('Starting data transformation.');

    // Update ETL status
    etlStatus.stage = 'Transforming';
    etlStatus.message = 'Transforming extracted data.';

    const batchSize = 1000;
    let batchProgress = 0;

    // Maps to store unique customers, companies, and country counts
    const uniqueCustomers = new Map();
    const uniqueCompanies = new Map();
    const countryCounts = new Map();
    const formattedData = [];
    let duplicateCount = 0;

    // Process data in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      batch.forEach((customer) => {
        // Skip duplicate customer entries
        if (uniqueCustomers.has(customer['Customer Id'])) {
          duplicateCount++;
          return;
        }
        uniqueCustomers.set(customer['Customer Id'], true);

        // Normalize date format
        if (customer['Subscription Date'] !== 'N/A') {
          const dateParts = customer['Subscription Date'].split('/');
          if (dateParts.length === 3) {
            customer['Subscription Date'] = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
          }
        }

        // Validate email format
        if (!validator.isEmail(customer['Email'])) {
          logger.info(`Invalid Email: Customer Id ${customer['Customer Id']} Email Entry:${customer['Email']}`);
          customer['Email'] = `Invalid Email - ${customer['Email']}`;
        }

        // Clean phone numbers
        customer['Phone 1'] = customer['Phone 1'].replace(/[^0-9+]/g, '');
        customer['Phone 2'] = customer['Phone 2'].replace(/[^0-9+]/g, '');

        // Log missing fields
        const missingKeys = Object.keys(customer).filter(key => customer[key] === 'N/A');
        if (missingKeys.length > 0) {
          logger.info(`Missing Field Entry: Customer Id ${customer['Customer Id']} Missing Field ${missingKeys}`);
        }

        // Track unique companies and countries
        if (customer['Company'] !== 'N/A') uniqueCompanies.set(customer['Company'], null);
        if (customer['Country'] !== 'N/A') countryCounts.set(customer['Country'], (countryCounts.get(customer['Country']) || 0) + 1);

        formattedData.push(customer);
      });

      batchProgress = ((i + batchSize) / data.length) * 100;
      logger.info(`Transformation progress: ${Math.min(100, batchProgress.toFixed(2))}%`);
      etlStatus.progress.transform = `${Math.min(100, batchProgress.toFixed(2))}%`;
    }

    // Compute average customers per country
    const totalCustomers = formattedData.length;
    const avgCustomersPerCountry = totalCustomers / countryCounts.size;

    // Update ETL status
    etlStatus.stage = 'Transformed';
    etlStatus.message = 'Data transformation complete.';
    etlStatus.progress.transform = '100%';
    etlStatus.avgCustomersPerCountry = avgCustomersPerCountry.toFixed(2)


    logger.info(`Removed ${duplicateCount} duplicate entries.`);
    logger.info(`Average number of customers per country: ${avgCustomersPerCountry.toFixed(2)}`);
    logger.info(`Transformation complete. Processed ${formattedData.length} records in ${Date.now() - startTime}ms.`);

    return { 
      formattedData, 
      uniqueCompanies: Array.from(uniqueCompanies.keys()),
      avgCustomersPerCountry: avgCustomersPerCountry.toFixed(2)
    };

  } catch (error) {
    logger.error(`Error during transformation: ${error.message}`);
    
    // Send an error email notification
    transporter.sendMail(sendErrorEmail('Transformation'), (error, info) => {
      if (error) {
        logger.error(`Failed to send error email: ${error.message}`);
      } else {
        logger.info(`Error email sent: ${info.response}`);
      }
    });
    
    throw error;
  }
}


//------------------DATA LOADING FUNCTION------------------//

async function loadData(dataObj) {
  const startTime = Date.now(); 
  const connection = await db.getConnection(); 
  try {
    logger.info(`Starting data loading.`);

    // Update ETL process status
    etlStatus.stage = 'Loading';
    etlStatus.message = 'Loading data into the database.';
    etlStatus.progress.load = {};
    
    await connection.beginTransaction(); 
    const { formattedData, uniqueCompanies, avgCustomersPerCountry } = dataObj;

    // Map to store company names and their corresponding IDs.
    let companyIdMap = new Map();

    // Insert unique companies and retrieve their IDs
    if (uniqueCompanies.length > 0) {
      const companyValues = uniqueCompanies.map(company => [company]);
      await connection.query(
        `INSERT IGNORE INTO Companies (company_name) VALUES ?;`,
        [companyValues]
      );

      // Retrieve all company IDs for later use
      const [companyRows] = await connection.query(`SELECT company_id, company_name FROM Companies;`);
      companyRows.forEach(row => companyIdMap.set(row.company_name, row.company_id));
    }

    const batchSize = 1000;
    let batchProgress = 0;

    // Batch insert function

    async function insertInBatches(query, data, batchName) {
      if (data.length === 0) return; // Avoid unnecessary processing if no data
    
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await connection.query(query, [batch]);
    
        // Correct batch progress calculation
        batchProgress = Math.min(100, Math.round(((i + batch.length) / data.length) * 100));
    
        // Prevent duplicate 100% logs
        if (batchProgress !== 100 || i === 0) {
          logger.info(`${batchName}: Loading progress: ${batchProgress}%`);
        }
    
        etlStatus.progress.load[batchName] = `${Math.min(100, batchProgress.toFixed(2))}%`;
      }
    }

    // Prepare Customer data for insertion
    const customerInserts = formattedData.map(c => [
      c['Customer Id'],
      c['First Name'],
      c['Last Name'],
      c['City'],
      c['Country'],
      c['Email']
    ]);

    // Insert Customers into the database
    await insertInBatches(
      `INSERT INTO Customers (customer_id, first_name, last_name, city, country, email) 
       VALUES ? ON DUPLICATE KEY UPDATE email = VALUES(email);`,
      customerInserts,
      'Customer Table'
    );

    // Verify Customer Insertions
    const [existingCustomers] = await connection.query('SELECT customer_id FROM Customers;');
    const existingCustomerIds = new Set(existingCustomers.map(row => row.customer_id));

    // Prepare dependent data for insertion
    const contactInserts = [];
    const subscriptionInserts = [];
    const customerCompanyInserts = [];
    const websiteInserts = [];

    formattedData.forEach(c => {
      if (!existingCustomerIds.has(c['Customer Id'])) {
        logger.info(`Skipping missing customer_id: ${c['Customer Id']}`);
        return;
      }
      if (c['Phone 1'] !== 'N/A') contactInserts.push([c['Customer Id'], c['Phone 1']]);
      if (c['Phone 2'] !== 'N/A') contactInserts.push([c['Customer Id'], c['Phone 2']]);
      if (c['Subscription Date'] !== 'N/A') subscriptionInserts.push([c['Customer Id'], c['Subscription Date']]);
      if (c['Company'] !== 'N/A' && companyIdMap.has(c['Company'])) {
        customerCompanyInserts.push([c['Customer Id'], companyIdMap.get(c['Company'])]); 
      }
      if (c['Website'] !== 'N/A') websiteInserts.push([c['Customer Id'], c['Website']]);
    });

    // Insert Contacts
    if (contactInserts.length > 0) {
      await insertInBatches(
        `INSERT INTO Contacts (customer_id, phone_number) VALUES ?;`,
        contactInserts,
        'Contacts Table'
      );
    }

    // Insert Subscriptions
    if (subscriptionInserts.length > 0) {
      await insertInBatches(
        `INSERT INTO Subscriptions (customer_id, subscription_date) VALUES ?;`,
        subscriptionInserts,
        'Subscription Table'
      );
    }

    // Insert Customer-Company Relationships
    if (customerCompanyInserts.length > 0) {
      await insertInBatches(
        `INSERT INTO Customer_Companies (customer_id, company_id) VALUES ?;`,
        customerCompanyInserts,
        'Company Table'
      );
    }

    // Insert Websites
    if (websiteInserts.length > 0) {
      await insertInBatches(
        `INSERT INTO Websites (customer_id, website_url) VALUES ?;`,
        websiteInserts,
        'Website Table'
      );
    }

    await connection.commit();

    logger.info(`Data loading complete. Loaded ${formattedData.length} records in ${Date.now() - startTime}ms.`);

    // Update ETL status
    etlStatus.stage = 'Complete';
    etlStatus.message = 'ETL process completed successfully.';

    return { success: true, message: 'Data loaded into database in batches' };

  } catch (error) {

    await connection.rollback(); // Rollback transaction on failure
    logger.error(`Error loading data: ${error.message}`);

    // Send error notification
    transporter.sendMail(sendErrorEmail('Loading'), (error, info) => {
      if (error) {
        logger.error(`Failed to send error email: ${error.message}`);
      } else {
        logger.info(`Error email sent: ${info.response}`);
      }
    });

    return { success: false, message: 'Error loading data' };

  } finally {
    connection.release(); 
  }
}

//------------------CLEAR DATA FUNCTION------------------//
async function clearAllData() {
  const startTime = Date.now();
  const connection = await db.getConnection();
  try {
    logger.info('Starting data clearing.');

    // Clear tables in the correct order (start with tables that have foreign key constraints)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;'); // Disable foreign key checks temporarily
    await connection.query('TRUNCATE TABLE Customer_Companies;');
    await connection.query('TRUNCATE TABLE Websites;');
    await connection.query('TRUNCATE TABLE Subscriptions;');
    await connection.query('TRUNCATE TABLE Contacts;');
    await connection.query('TRUNCATE TABLE Customers;');
    await connection.query('TRUNCATE TABLE Companies;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;'); // Re-enable foreign key checks

    logger.info(`Data clearing complete in ${Date.now() - startTime}ms.`);

  } catch (error) {
    logger.error(`Error clearing data: ${error.message}`);

    transporter.sendMail(sendErrorEmail('Clearing Database'), (error, info) => {
      if (error) {
        logger.error(`Failed to send error email: ${error.message}`);
      } else {
        logger.info(`Error email sent: ${info.response}`);
      }
    });

    throw error; 

  } finally {
    connection.release();
  }
}


//------------------API ROUTES------------------//

// Start process endpoint
app.post('/load-data', async (req, res) => {
  try {
    const rawData = await extractData();
    const transformedData = transformData(rawData);
    const result = await loadData(transformedData);

    res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Data loading failed', details: err.message });
  }
});

// Clear database tables endpoint
app.get('/clear-all-data', async (req, res) => {
  try {
    await clearAllData(); // Call the function to clear all data
    res.status(200).json({ message: 'All data cleared successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Error clearing data', details: err.message });
  }
});

// ETL status endpoint
app.get('/etl/status', (req, res) => {
  res.status(200).json(etlStatus);
});

// Winston log endpoint
app.get('/winston', (req, res) => {
  fs.readFile('etl.log', 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error reading log file');
    }
    res.type('text/plain').send(data);
  });
});


//------------------SERVER SETUP------------------//

app.listen(PORT, async () => {
  console.log(`Server listening on port: ${PORT}...`);
  await setupDatabase();
});

module.exports = app;