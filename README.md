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

## MySQL Setup

## Configure MySQL to Use TCP/IP Connector

1. Modify MySQL configuration:  
   ```bash
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

2. Add the following lines to the config file, then save and exit:
    ```bash
    [mysqld]
    bind-address = 127.0.0.1
3. Restart MySQL:
    ```bash
    sudo service mysql restart
4. Verify MySQL is listening on 127.0.0.1:
    ```bash
    netstat -tulnp | grep 3306
    
    -Expected response
      tcp  0  0 127.0.0.1:3306  0.0.0.0:*  LISTEN  ...

If you do not have your MySQL login:
1. Login to MySQL as root:
    ```bash
    sudo mysql -u root
2. Update root password (replace 'yourpassword' accordingly):
    ```sql
    ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpassword';
3. Update privileges:
    ```sql
    GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
    FLUSH PRIVILEGES;

Database Setup
1. Start MySQL service:
     ```bash
    sudo service mysql start
2. Login to MySQL:
     ```bash
    sudo mysql -u root -p
3. Create a database named customer_db:
    ```sql
    CREATE DATABASE customer_db;
    USE customer_db;
    ```

## To get started
- Once database has been setup and confirmed on 127.0.0.1
```bash
  npm start
  ```
- Click on "Load Data" to begin ETL Process.

- Get Status can be clicked immediately and will poll for status update every 3 seconds

- Fetch Logs to render processing log


## dotENV
- DB_HOST=127.0.0.1
- DB_USER=root
- DB_PASS=
- DB_NAME=customer_db
- EMAIL_USER=
- EMAIL_PASS=
- ALERT_EMAIL=

## Customer Sample Dataset

## Customer Data

| Index | Customer Id | First Name | Last Name | Company | City | Country | Phone 1 | Phone 2 | Email | Subscription Date | Website |
|-------|------------|------------|-----------|---------|------|---------|---------|---------|-------|------------------|---------|
| 1 | 138fB5315da5fE9 | Jeanne | Ferrell | Wilcox-Fox | Tonichester | British Virgin Islands | 001-995-820-0140x05493 | (757)324-8634 | aaronwoods@walter.com | 3/27/2020 | https://www.romero.biz/ |
| 2 | b0d61acAc72A388 | Ian | Browning | Meadows Inc | Colontown | El Salvador | 218-383-6764 | +1-213-212-0464x0742 | zschultz@blevins-church.info | 3/12/2021 | https://ford.com/ |
| 3 | 1B27Ff7Fd418C89 | Taylor | Martinez | Nicholson Inc | East Evelyn | Marshall Islands | 1-455-875-7024 | (783)689-6710x09859 | monicacoffey@moody.com | 8/29/2021 | http://love-morales.com/ |
| 4 | eff8bbcED3eacD8 | Andre | Mccall | Cooper Ltd | New Luis | Colombia | (334)358-5162x861 | 016-422-2338 | parkerdiana@orr.net | 5/29/2020 | http://vaughan.biz/ |
| 5 | 73ee6AaCAcea39C | Alyssa | Mcneil | Arnold, Neal and Reed | New Jay | Netherlands Antilles | +1-344-219-8095x764 | 001-178-547-0380x10666 | janephillips@nicholson-franklin.com | 11/10/2020 | http://ibarra-adkins.com/ |
| 6 | e4A1fb3fA732CED | Marisa | West | Stanley PLC | Dalemouth | Morocco | +1-211-391-0983x663 | 701-169-4514 | matthew73@rush.info | 7/9/2020 | http://www.holland-ochoa.org/ |
| 7 | dC9dbfa601b71b5 | Jaclyn | Branch | Ballard LLC | East Jacquelineberg | Bulgaria | 3552675231 | +1-769-658-2475x78782 | hrobbins@hodge.com | 5/7/2020 | https://patrick-whitehead.com/ |
| 8 | 38ce8fA0e07AdEe | Billy | Stone | Decker, Frederick and Pittman | Tammieburgh | Cayman Islands | 109.506.0401x9595 | 405.634.9674 | kmcneil@hendrix-callahan.biz | 11/6/2021 | http://www.stout.com/ |
| 9 | 134e7E02Ccb2614 | Cristian | Waters | Bright LLC | Shaneville | Uruguay | (569)288-1186x339 | | wanda26@rios.com | 3/6/2020 | https://www.clarke-davis.com/ |
| 10 | BAd847028B01cCF | Edward | Meza | Moore PLC | New Jade | Puerto Rico | +1-753-511-1815x4880 | 388.374.1422x28744 | sheilarios@myers.biz | | https://farley.com/ |
| 11 | AB7F973e25C48cc | Tonya | Casey | Anthony Ltd | Jonbury | Macedonia | 708.631.6521 | 756-377-6482x426 | roachgerald@gomez-patton.info | 4/17/2020 | http://obrien-holder.com/ |
| 12 | 097E7318EB2BdeE | Franklin | Estes | Ho LLC | Salasville | Sierra Leone | 439.903.8544x933 | 913-415-3834 | jaclyn40@ramsey.com | 4/13/2021 | http://www.nelson.biz/ |
| 13 | aF87BD4c6815163 | Candace | Macdonald | Wilkins, Villa and Lloyd | New Walter | Montenegro | (205)001-7993x5174 | 7247692116 | hpetersen@whitney.info | 1/12/2020 | http://www.odom.com/ |
| 14 | 8d3acB34bF34dC2 | Gabriella | Nielsen | Pollard-Meyers | Gordonburgh | Sweden | +1-650-214-2790x041 | 1-708-649-9945 | | 9/26/2021 | |
| 15 | baf4e1E54ba26Fe | Linda | Velez | | Terrellport | Guadeloupe | (620)148-8832x4011 | (430)644-3960x13772 | rebecca53@ali.org | 1/29/2021 | http://www.gutierrez-bray.com/ |
| 16 | d7cADd8B56F531D | Cindy | Haynes | Lozano and Sons | South Tom | Colombia | | 001-504-170-7374 | rubenmahoney@warner.com | 7/7/2020 | https://www.fritz-harrington.biz/ |
| 17 | 8C2AF7ca332C2BA | Shawn | Wheeler | Harmon-Wallace | Kaufmanville | American Samoa | 926.256.7746x07704 | 1-942-927-9013 | faithfarrell@barron.net | 1/1/2022 | http://gallagher-underwood.com/ |
| 18 | 7ad82F593ACFCac | Joe | Hayden | Suarez PLC | Richardland | Azerbaijan | 645.759.1156x19217 | 001-099-165-5270x28215 | sergio33@fitzpatrick.com | 8/19/2020 | http://holder.com/ |
| 19 | e0E8F335e7495f2 | Daryl | Rodgers | Gould and Sons | East Brooke | | 914.756.1802x95427 | 1-802-269-2026 | floresdawn@herman.info | 5/24/2021 | https://www.drake-garrett.com/ |
| 20 | AB7F973e25C48cc | Tonya | Casey | Anthony Ltd | Jonbury | Macedonia | 708.631.6521 | 756-377-6482x426 | roachgerald@gomez-patton.info | 4/17/2020 | http://obrien-holder.com/ |

