-- ==============================
-- DROP TABLES (to reset database)
-- ==============================

DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS insight CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;


-- ==============================
-- USERS TABLE
-- ==============================

CREATE TABLE users(
    uid SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);


-- ==============================
-- INSERT USERS
-- ==============================

INSERT INTO users(username, email, password) VALUES 
('rahul','rahul@gmail.com','rahul101'),
('neha','neha10@gmail.com','neha101'),
('asmi','asmi876@hotmail.com','asmi917'),
('mitali','mitali87@gmail.com','mitali987'),
('mahima','mahima@hotmail.com','mahima912');


-- Check users
SELECT * FROM users;


-- ==============================
-- PRODUCTS TABLE
-- ==============================

CREATE TABLE products(
    pid SERIAL PRIMARY KEY,
    uid INT REFERENCES users(uid) ON DELETE CASCADE,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    cost_price NUMERIC(10,2) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    quantity_sold INT NOT NULL,
    month VARCHAR(10),
    demand_level VARCHAR(10)
);


-- ==============================
-- SAMPLE PRODUCTS (USER WISE)
-- ==============================

INSERT INTO products 
(uid, product_name, category, cost_price, selling_price, quantity_sold, month, demand_level)
VALUES
(1,'Laptop','Electronics',40000,50000,15,'Jan','High'),
(1,'Headphones','Electronics',1500,2500,40,'Feb','Medium'),

(2,'T-Shirt','Clothing',200,400,120,'Feb','Medium'),
(2,'Jeans','Clothing',800,1500,60,'Mar','High'),

(3,'Chocolate','Food',20,40,300,'Mar','High'),
(3,'Biscuits','Food',10,25,500,'Apr','High'),

(4,'Face Cream','Cosmetics',150,350,80,'May','Medium'),
(4,'Lipstick','Cosmetics',200,450,70,'Jun','High'),

(5,'Football','Sports',400,900,45,'Jul','Medium'),
(5,'Cricket Bat','Sports',800,1800,30,'Aug','High');


-- Check products
SELECT * FROM products;


-- ==============================
-- INSIGHT TABLE
-- ==============================

CREATE TABLE insight(
    inid SERIAL PRIMARY KEY,
    pid INT REFERENCES products(pid) ON DELETE CASCADE,
    uid INT REFERENCES users(uid) ON DELETE CASCADE,
    profit_margin INT,
    peak_sales_month VARCHAR(50),
    demand_level VARCHAR(100),
    suggestions TEXT
);


-- ==============================
-- INSERT INSIGHTS
-- ==============================

INSERT INTO insight(uid, pid, profit_margin, peak_sales_month, demand_level, suggestions) VALUES
(1,1,20,'January','High','Increase stock for electronics in winter'),
(2,3,50,'March','Medium','Run seasonal clothing discounts'),
(3,5,33,'April','High','Food products sell well in summer'),
(4,7,45,'June','Medium','Promote cosmetics with offers'),
(5,9,55,'August','High','Sports demand rises during tournaments');


-- Check insights
SELECT * FROM insight;


-- ==============================
-- REPORTS TABLE
-- ==============================

CREATE TABLE reports(
    report_id SERIAL PRIMARY KEY,
    pid INT REFERENCES products(pid) ON DELETE CASCADE,
    file_name VARCHAR(100),
    file_path VARCHAR(255),
    generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==============================
-- INSERT REPORTS
-- ==============================

INSERT INTO reports(pid, file_name, file_path) VALUES
(1,'electronics_report.pdf','/files/reports/electronics_report.pdf'),
(3,'clothing_report.pdf','/files/reports/clothing_report.pdf'),
(5,'food_report.pdf','/files/reports/food_report.pdf'),
(7,'cosmetics_report.pdf','/files/reports/cosmetics_report.pdf'),
(9,'sports_report.pdf','/files/reports/sports_report.pdf');


-- Check reports
SELECT * FROM reports;