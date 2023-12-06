const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const axios = require("axios");
const path = require("path");
const cors = require("cors");

const databasePath = path.join(__dirname, "transaction.db");

const app = express();

app.use(express.json());
app.use(cors());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    await database.run(`
      CREATE TABLE IF NOT EXISTS transactionTable (
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

    app.listen(3001, () =>
      console.log("Server Running at http://localhost:3001/")
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

      let sql = `INSERT OR IGNORE INTO transactionTable (id,title,price,description,category,image,sold,dateOfSale) VALUES(?,?,?,?,?,?,?,?)`;
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

setTimeout(() => {
  getData(" https://s3.amazonaws.com/roxiler.com/product_transaction.json");
}, 5000);

app.get("/transactions", async (req, res) => {
  const query = `
      SELECT * FROM transactionTable`;
  const transactions = await database.all(query);
  res.send(transactions);
});

app.get("/transactions-search", async (req, res) => {
  try {
    const { search = "", page = 1, perPage = 10 } = req.query;

    const offset = (page - 1) * perPage;

    let searchCondition = "";
    if (search) {
      searchCondition = `
       WHERE title LIKE '%${search}%' OR
              description LIKE '%${search}%' OR
              price LIKE '%${search}%' OR
              strftime('%Y-%m', dateOfSale) = '${month}' OR
              strftime('%Y', dateOfSale) = '${month}' OR
              strftime('%d', dateOfSale) = '${month}'
      `;
    }

    const query = `
      SELECT * FROM transactionTable
      ${searchCondition}
      ORDER BY id
      LIMIT ${perPage} OFFSET ${offset}
    `;

    const transactions = await database.all(query);

    res.json(transactions);
  } catch (error) {
    console.error(`List Transactions Error: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/statistics", async (req, res) => {
  try {
    const { month } = req.query;

    const totalSaleAmountResult = await database.get(
      "SELECT SUM(price) AS totalSaleAmount FROM transactionTable WHERE strftime('%Y-%m', dateOfSale) = ? AND sold = 1",
      [month]
    );
    const totalSaleAmount = totalSaleAmountResult.totalSaleAmount || 0;

    const totalSoldResult = await database.get(
      "SELECT COUNT(*) AS totalSold FROM transactionTable WHERE strftime('%Y-%m', dateOfSale) = ? AND sold = 1",
      [month]
    );
    const totalSold = totalSoldResult.totalSold || 0;

    const totalNotSoldResult = await database.get(
      "SELECT COUNT(*) AS totalNotSold FROM transactionTable WHERE strftime('%Y-%m', dateOfSale) = ? AND sold = 0",
      [month]
    );
    const totalNotSold = totalNotSoldResult.totalNotSold || 0;

    res.json({
      totalSaleAmount,
      totalSold,
      totalNotSold,
    });
  } catch (error) {
    console.error(`Statistics Error: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/bar-chart", async (req, res) => {
  try {
    const { month } = req.query;

    // Define price ranges
    const priceRanges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: 1000 },
    ];

    const priceRangesData = await Promise.all(
      priceRanges.map(async (range) => {
        const { min, max } = range;

        const result = await database.get(
          "SELECT COUNT(*) AS count FROM transactionTable WHERE strftime('%m', dateOfSale) = ? AND price >= ? AND price <= ?",
          [month, min, max]
        );

        return { range: `${min}-${max}`, count: result.count || 0 };
      })
    );

    res.json(priceRangesData);
  } catch (error) {
    console.error(`Bar Chart Error: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/pie-chart", async (req, res) => {
  try {
    const { month } = req.query;

    const categoriesData = await database.all(
      "SELECT category, COUNT(*) AS count FROM transactionTable WHERE strftime('%Y-%m', dateOfSale) = ? GROUP BY category",
      [month]
    );

    res.json(
      categoriesData.map(({ category, count }) => ({ [category]: count }))
    );
  } catch (error) {
    console.error(`Pie Chart Error: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const getTotalStatistics = async (month) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/statistics?month=${month}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching total statistics: ${error.message}`);
    throw error;
  }
};

const getBarChartData = async (month) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/bar-chart?month=${month}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching bar chart data: ${error.message}`);
    throw error;
  }
};

const getPieChartData = async (month) => {
  try {
    const response = await axios.get(
      `http://localhost:3001/pie-chart?month=${month}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching pie chart data: ${error.message}`);
    throw error;
  }
};

app.get("/combined-data", async (req, res) => {
  try {
    const { month } = req.query;

    const [totalStatistics, barChartData, pieChartData] = await Promise.all([
      getTotalStatistics(month),
      getBarChartData(month),
      getPieChartData(month),
    ]);

    const combinedResponse = {
      totalStatistics,
      barChartData,
      pieChartData,
    };

    res.json(combinedResponse);
  } catch (error) {
    console.error(`Combined Data Error: ${error.message}`);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = app;
