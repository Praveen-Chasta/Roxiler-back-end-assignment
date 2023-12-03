const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const axios = require("axios");
const path = require("path");

const databasePath = path.join(__dirname, "transaction.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    await database.run(`
      CREATE TABLE IF NOT EXISTS [transaction] (
        id INTEGER PRIMARY KEY,
        title VARCHAR(255),
        price DECIMAL(10, 2),
        description TEXT,
        category VARCHAR(50),
        image VARCHAR(255),
        sold INTEGER,
        dateOfSale DATE
      );
    `);

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

async function getData(url) {
  try {
    const { data } = await axios.get(url);
    data.forEach((d) => {
      const userData = {
        id: d.id,
        title: d.title,
        price: d.price,
        description: d.description,
        category: d.category,
        image: d.image,
        sold: d.sold,
        dateOfSale: d.dateOfSale,
      };

      let sql = `INSERT INTO transaction(id,title,price,description,category,image,sold,dateOfSale) VALUES(?,?,?,?,?,?,?,?)`;
      try {
        database.run(sql, [
          userData.id,
          userData.title,
          userData.price,
          userData.description,
          userData.category,
          userData.image,
          userData.sold,
          userData.dateOfSale,
        ]);
      } catch (error) {
        console.error(`DB Insert Error: ${error.message}`);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

getData("https://s3.amazonaws.com/roxiler.com/product_transaction.json");
