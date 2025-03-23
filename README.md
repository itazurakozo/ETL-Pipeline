# ETL Pipeline

## **ETL Process Overview**

This is an implementation of a ETL(Extract, Transform, Load) pipeline that processes a large CSV dataset containing customer information. The flow includes:

- **Extract**: The data is extracted from a CSV file (selected by assigning the path of a CSV file located in `/csv-raw` in `server.js`, line 17). Any missing or empty fields are filled with `'N/A'`.

- **Transform**: In this phase, the extracted data is cleaned and transformed:
  - Duplicate entries are removed.
  - Date formats are standardized.
  - Emails and phone numbers are validated and cleaned.
  - Additional insights like the average number of customers per country are calculated.

- **Load**: The cleaned and transformed data is then loaded into a MySQL database in batch operations to ensure efficiency.

The ETL pipeline is monitored through:
- Status updates and logs.
- Any errors trigger **email alerts** to the designated recipient.

## **Tech Stack**

### Backend:
- **Node.js with Express**
- **MySQL2**
- **CORS**
- **Nodemailer**
- **Winston**
- **CSV-Parser**
- **Nodemon**
- **dotenv**

### Frontend:
- **React**
- **React Router**
- **Webpack**
- **Babel**
- **CSS-Loader / Style-Loader**

### Development:
- **Webpack Dev Server**

## **Performance Optimizations**

- **CSV Parsing Stream**: Instead of loading the entire CSV file into memory, data is processed using streams to ensure that even large files can be handled efficiently.
- **Batch Processing**: Data is both transformed and loaded into the database in batches to improve performance and avoid memory overload.
- **Database Indexing**: Relevant fields such as `customer_id` and `company_id` are indexed to speed up queries and lookups.
- **Transaction Handling**: The ETL process uses MySQL transactions to ensure data integrity. If any part of the data loading process fails, the transaction is rolled back, and the database remains in a consistent state.
- **Error Handling**: Detailed error messages are logged using **Winston**, and **email notifications** are sent in case of failures during any phase of the ETL process.

## **SQL Schema / Database Structure**

### **Customer Table:**
```sql
CREATE TABLE Customers (
  customer_id VARCHAR(20) PRIMARY KEY,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100),
  email VARCHAR(100) UNIQUE
);

CREATE TABLE Contacts (
  contact_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(20),
  phone_number VARCHAR(50),
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE Subscriptions (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id VARCHAR(20),
  subscription_date DATE,
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE Companies (
  company_id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) UNIQUE
);

CREATE TABLE Customer_Companies (
  customer_id VARCHAR(20),
  company_id INT,
  PRIMARY KEY (customer_id, company_id),
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
);

CREATE TABLE Customer_Companies (
  customer_id VARCHAR(20),
  company_id INT,
  PRIMARY KEY (customer_id, company_id),
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES Companies(company_id) ON DELETE CASCADE
);
```

## CSV File Notes
- Values at the end of the CSV file indicates the number of entries
- Files ending with "m" indicates entires have missing fields


## dotENV
- DB_HOST=127.0.0.1
- DB_USER=root
- DB_PASS=
- DB_NAME=customer_db
- EMAIL_USER=
- EMAIL_PASS=
- ALERT_EMAIL=